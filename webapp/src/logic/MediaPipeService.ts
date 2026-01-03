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
    private logger: (msg: string) => void;

    // Tracking state for smoothing
    private lastKnownPosition: { x: number; y: number } | null = null;
    private velocity: { x: number; y: number } = { x: 0, y: 0 };
    private lastFrameTime: number = 0;
    public initPromise: Promise<void>;

    constructor(videoElement: HTMLVideoElement, onResultsCallback: (results: Results) => void, logger?: (msg: string) => void) {
        this.videoElement = videoElement;
        this.onResultsCallback = onResultsCallback;
        this.logger = logger || console.log;

        this.hands = new Hands({
            locateFile: (file) => {
                return `/mediapipe/${file}`;
            }
        });

        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1, // Increased for better accuracy
            minDetectionConfidence: 0.4, // Slightly higher for stability
            minTrackingConfidence: 0.4
        });

        this.hands.onResults((results) => {
            this.processResults(results);
        });

        // Force initialization
        this.logger("MediaPipeService: Calling hands.initialize()...");
        this.initPromise = this.hands.initialize()
            .then(() => {
                this.logger("MediaPipe: Init Success");
            })
            .catch(e => {
                this.logger(`MediaPipe: Init Fail ${e}`);
                throw e;
            });
    }

    /**
     * Process results with velocity-based smoothing for reduced jitter
     */
    private processResults(results: Results): void {
        const now = performance.now();
        const dt = this.lastFrameTime ? (now - this.lastFrameTime) / 1000 : 0.016;
        this.lastFrameTime = now;

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const hand = results.multiHandLandmarks[0];
            const indexTip = hand[8];
            const newPos = { x: indexTip.x, y: indexTip.y };

            // Calculate velocity for predictive smoothing
            if (this.lastKnownPosition) {
                this.velocity.x = (newPos.x - this.lastKnownPosition.x) / Math.max(dt, 0.016);
                this.velocity.y = (newPos.y - this.lastKnownPosition.y) / Math.max(dt, 0.016);
            }

            this.lastKnownPosition = newPos;
            this.onResultsCallback(results);
        } else {
            // Use velocity prediction briefly when hand is lost
            if (this.lastKnownPosition && dt < 0.1) {
                // Decay velocity
                this.velocity.x *= 0.9;
                this.velocity.y *= 0.9;
            }
            this.onResultsCallback(results);
        }
    }


    async start() {
        await this.initPromise;
        if (this.camera) return;

        // Use a lower resolution for mobile web performance
        const isMobile = window.innerWidth < 768;
        const width = isMobile ? 640 : 1280;
        const height = isMobile ? 480 : 720;

        this.logger(`MediaPipeService: Starting camera with ${width}x${height}`);
        this.camera = new Camera(this.videoElement, {
            onFrame: async () => {
                try {
                    await this.hands.send({ image: this.videoElement });
                } catch (e) {
                    this.logger(`MediaPipeService: Frame Error: ${e}`);
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
