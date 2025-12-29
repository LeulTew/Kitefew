import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaPipeService } from '../MediaPipeService';
import { Hands, type Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

// Mock MediaPipe
const mockHandsInstance = {
    setOptions: vi.fn(),
    onResults: vi.fn(),
    initialize: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
};

const mockCameraInstance = {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
};

vi.mock('@mediapipe/hands', () => {
    return {
        Hands: vi.fn().mockImplementation(function() {
            return {
                setOptions: mockHandsInstance.setOptions,
                onResults: mockHandsInstance.onResults,
                initialize: mockHandsInstance.initialize,
                send: mockHandsInstance.send,
                close: mockHandsInstance.close,
            };
        })
    };
});

vi.mock('@mediapipe/camera_utils', () => {
    return {
        Camera: vi.fn().mockImplementation(function() {
            return {
                start: mockCameraInstance.start,
                stop: mockCameraInstance.stop,
            };
        })
    };
});

describe('MediaPipeService', () => {
    let videoElement: HTMLVideoElement;
    let service: MediaPipeService;
    const mockOnResults = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mock implementations to default
        mockHandsInstance.initialize.mockResolvedValue(undefined);
        mockHandsInstance.send.mockResolvedValue(undefined);
        
        videoElement = document.createElement('video');
        service = new MediaPipeService(videoElement, mockOnResults);
    });

    it('should initialize correctly', async () => {
        await service.initPromise;
        expect(service.hands).toBeDefined();
    });

    it('should use correct locateFile path', () => {
        const handsMock = vi.mocked(Hands);
        // Actually, we need the constructor arguments
        const constructorArgs = handsMock.mock.calls[0][0];
        expect(constructorArgs?.locateFile?.('test.js')).toBe('/mediapipe/test.js');
    });

    it('should handle initialization failure', async () => {
        mockHandsInstance.initialize.mockRejectedValueOnce(new Error('Init Failed'));

        const failService = new MediaPipeService(videoElement, mockOnResults);
        await expect(failService.initPromise).rejects.toThrow('Init Failed');
    });

    it('should start the camera', async () => {
        await service.start();
        expect(service.camera).toBeDefined();
    });

    it('should stop the service', async () => {
        await service.start();
        await service.stop();
        expect(service.camera).toBeNull();
    });

    it('should handle results', () => {
        const mockResults = {
            multiHandLandmarks: [new Array(21).fill({ x: 0.5, y: 0.5 })],
        } as unknown as Results;

        // Access private method for testing
        (service as unknown as { processResults: (r: Results) => void }).processResults(mockResults);
        expect(mockOnResults).toHaveBeenCalledWith(mockResults);
        expect(service.getLastKnownPosition()).toEqual({ x: 0.5, y: 0.5 });
    });

    it('should handle empty results with last known position', () => {
        // Set last known position first
        const mockResults = {
            multiHandLandmarks: [new Array(21).fill({ x: 0.5, y: 0.5 })],
        } as unknown as Results;
        (service as unknown as { processResults: (r: Results) => void }).processResults(mockResults);

        // Now send empty results
        const emptyResults = { multiHandLandmarks: [] } as unknown as Results;
        (service as unknown as { processResults: (r: Results) => void }).processResults(emptyResults);
        expect(mockOnResults).toHaveBeenCalledTimes(2);
    });

    it('should not start camera if already started', async () => {
        await service.start();
        const firstCamera = service.camera;
        await service.start();
        expect(service.camera).toBe(firstCamera);
    });

    it('should handle mobile resolution', async () => {
        // Mock window.innerWidth
        const originalWidth = window.innerWidth;
        Object.defineProperty(window, 'innerWidth', { value: 500, writable: true, configurable: true });

        const mobileService = new MediaPipeService(videoElement, mockOnResults);
        await mobileService.start();
        expect(mobileService.camera).toBeDefined();

        Object.defineProperty(window, 'innerWidth', { value: originalWidth, writable: true, configurable: true });
    });

    it('should handle empty results without last known position', () => {
        const mockResults = { multiHandLandmarks: [] } as unknown as Results;
        (service as unknown as { processResults: (r: Results) => void }).processResults(mockResults);
        expect(mockOnResults).not.toHaveBeenCalled();
    });

    it('should handle camera frame errors', async () => {
        await service.start();
        const cameraMock = vi.mocked(Camera);
        const onFrame = cameraMock.mock.calls[0][1].onFrame;

        // Mock hands.send to throw
        mockHandsInstance.send.mockRejectedValueOnce(new Error('Send Failed'));

        await expect(onFrame()).resolves.not.toThrow();
    });
});
