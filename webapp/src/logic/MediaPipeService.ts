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

    // Tracking state
    private lastKnownPosition: { x: number; y: number } | null = null;
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
            modelComplexity: 1,
            minDetectionConfidence: 0.6,
            minTrackingConfidence: 0.6
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
     * Simple result processing - no velocity prediction
     */
    private processResults(results: Results): void {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const hand = results.multiHandLandmarks[0];
            const indexTip = hand[8];
            this.lastKnownPosition = { x: indexTip.x, y: indexTip.y };
        }
        this.onResultsCallback(results);
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
