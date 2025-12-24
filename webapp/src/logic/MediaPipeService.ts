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

    constructor(videoElement: HTMLVideoElement, onResultsCallback: (results: Results) => void) {
        this.videoElement = videoElement;
        this.onResultsCallback = onResultsCallback;

        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`;
            }
        });

        this.hands.setOptions({
            maxNumHands: 1, // Reduced to 1 for mobile performance
            modelComplexity: 0, // Lite model for speed on mobile
            minDetectionConfidence: 0.2, // Very forgiving
            minTrackingConfidence: 0.2
        });

        this.hands.onResults((results) => this.processResults(results));

        // Force initialization
        this.hands.initialize().catch(e => console.error("MediaPipe Init Error:", e));
    }

    /**
     * Process results with multi-hand selection and visibility filtering
     */
    private processResults(results: Results): void {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const hand = results.multiHandLandmarks[0];
            const indexTip = hand[8];
            this.lastKnownPosition = { x: indexTip.x, y: indexTip.y };

            this.onResultsCallback(results);
        } else {
            // Use interpolation if available
            if (this.lastKnownPosition) {
                this.onResultsCallback(results); // Engine will handle hidden state
            }
        }
    }


    async start() {
        if (this.camera) return;

        // Use a lower resolution for mobile web performance
        const isMobile = window.innerWidth < 768;
        const width = isMobile ? 640 : 1280;
        const height = isMobile ? 480 : 720;

        this.camera = new Camera(this.videoElement, {
            onFrame: async () => {
                try {
                    await this.hands.send({ image: this.videoElement });
                } catch (e) {
                    console.error("Tracking Error:", e);
                }
            },
            width: width,
            height: height
        });

        await this.camera.start();
    }

    /**
     * Get last known position even if hand is temporarily lost
     */
    getLastKnownPosition(): { x: number; y: number } | null {
        return this.lastKnownPosition;
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
