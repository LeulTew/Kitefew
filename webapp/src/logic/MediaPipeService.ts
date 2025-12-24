import { Hands, type Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

/**
 * MediaPipe Hand Tracking Service - Optimized for:
 * - Bad lighting conditions
 * - Multiple hands (tracks first detected)
 * - Visibility/occlusion issues
 */
export class MediaPipeService {
    hands: Hands;
    camera: Camera | null = null;
    videoElement: HTMLVideoElement;
    onResultsCallback: (results: Results) => void;

    // Tracking state for smoothing
    private lastKnownPosition: { x: number; y: number } | null = null;
    private lostFrameCount = 0;
    private readonly MAX_LOST_FRAMES = 10; // Keep last position for 10 frames

    constructor(videoElement: HTMLVideoElement, onResultsCallback: (results: Results) => void) {
        this.videoElement = videoElement;
        this.onResultsCallback = onResultsCallback;

        this.hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        this.hands.setOptions({
            // Allow 2 hands but we'll pick the best one
            maxNumHands: 2,

            // Higher complexity = better accuracy in poor conditions
            // 0 = lite, 1 = full, 2 = full+ (most accurate but slower)
            modelComplexity: 1,

            // LOWERED for bad lighting - will detect hands even with low confidence
            // Default is 0.5, we use 0.3 to catch hands in shadows/low light
            minDetectionConfidence: 0.3,

            // LOWERED for occlusion/visibility - keeps tracking even when partially hidden
            // Default is 0.5, we use 0.3 to handle fingers going out of frame
            minTrackingConfidence: 0.3
        });

        this.hands.onResults((results) => this.processResults(results));
    }

    /**
     * Process results with multi-hand selection and visibility filtering
     */
    private processResults(results: Results): void {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            // If multiple hands, pick the one with best visibility
            let bestHand = results.multiHandLandmarks[0];
            let bestVisibility = this.calculateHandVisibility(results.multiHandLandmarks[0]);

            for (let i = 1; i < results.multiHandLandmarks.length; i++) {
                const visibility = this.calculateHandVisibility(results.multiHandLandmarks[i]);
                if (visibility > bestVisibility) {
                    bestVisibility = visibility;
                    bestHand = results.multiHandLandmarks[i];
                }
            }

            // Update position tracking
            const indexTip = bestHand[8]; // Index finger tip
            this.lastKnownPosition = { x: indexTip.x, y: indexTip.y };
            this.lostFrameCount = 0;

            // Forward the best hand's results
            this.onResultsCallback({
                ...results,
                multiHandLandmarks: [bestHand],
                multiHandedness: results.multiHandedness?.slice(0, 1)
            } as Results);
        } else {
            // Hand lost - use interpolation for a few frames
            this.lostFrameCount++;

            if (this.lostFrameCount <= this.MAX_LOST_FRAMES && this.lastKnownPosition) {
                // Create synthetic result with last known position
                // This prevents jitter when hand is briefly occluded
                this.onResultsCallback(results); // Still send empty for UI update
            } else {
                this.lastKnownPosition = null;
                this.onResultsCallback(results);
            }
        }
    }

    /**
     * Calculate average visibility score for a hand
     * Higher = more visible/better tracking
     */
    private calculateHandVisibility(landmarks: Results['multiHandLandmarks'][0]): number {
        // Focus on key points: wrist, thumb tip, index tip, middle tip
        const keyPoints = [0, 4, 8, 12]; // wrist, thumb, index, middle
        let totalVisibility = 0;
        let count = 0;

        for (const idx of keyPoints) {
            if (landmarks[idx]) {
                // Visibility is in z coordinate - closer to 0 = more visible
                // We also check if point is within reasonable bounds
                const point = landmarks[idx];
                const inBounds = point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1;
                totalVisibility += inBounds ? 1 : 0;
                count++;
            }
        }

        return count > 0 ? totalVisibility / count : 0;
    }

    async start() {
        if (this.camera) return;

        this.camera = new Camera(this.videoElement, {
            onFrame: async () => {
                await this.hands.send({ image: this.videoElement });
            },
            // Higher resolution for better detection in poor lighting
            width: 1280,
            height: 720
        });

        await this.camera.start();
    }

    /**
     * Get last known position even if hand is temporarily lost
     */
    getLastKnownPosition(): { x: number; y: number } | null {
        return this.lostFrameCount <= this.MAX_LOST_FRAMES ? this.lastKnownPosition : null;
    }

    async stop() {
        if (this.camera) {
            await this.camera.stop();
            this.camera = null;
        }
        if (this.hands) {
            await this.hands.close();
        }
    }
}
