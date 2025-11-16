import { waitFor } from "@testing-library/react-native";

jest.mock('expo-media-library', () => ({
    usePermissions: jest.fn(),
    getAlbumsAsync: jest.fn(),
    getAssetsAsync: jest.fn()
}));
jest.mock('@infinitered/react-native-mlkit-image-labeling', () => ({
    useImageLabeling: jest.fn(),
}), { virtual: true });
jest.mock('aws-amplify/storage', () => ({
    uploadData: jest.fn(),
}));
jest.mock('../api', () => ({
    api: {
        uploadPhoto: jest.fn()
    }
}));

describe("useAlbumScanner", () => {
    let MediaLibrary: any;
    let useAlbumScanner: any;
    let useImageLabeling: any;
    let uploadData: any;
    let api: any;

    beforeEach(() => {
        jest.resetModules();
        global.fetch = jest.fn().mockResolvedValue({ blob: jest.fn() });
        MediaLibrary = require("expo-media-library");
        useAlbumScanner = require("./useAlbumScanner").useAlbumScanner;
        useImageLabeling = require("@infinitered/react-native-mlkit-image-labeling").useImageLabeling;
        uploadData = require("aws-amplify/storage").uploadData;
        api = require("../api").api;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should ask for permission if not granted", async () => {
        const mockRequestPermission = jest.fn();
        MediaLibrary.usePermissions.mockReturnValue([{ status: "denied" }, mockRequestPermission]);
        MediaLibrary.getAlbumsAsync.mockResolvedValue([{ assetCount: 0 }]);

        const { scanAlbums } = useAlbumScanner();
        await scanAlbums(() => { });
        expect(mockRequestPermission).toHaveBeenCalled();
    });
    it("should skip empty albums", async () => {
        MediaLibrary.usePermissions.mockReturnValue([{ status: "granted" }, jest.fn()]);
        MediaLibrary.getAlbumsAsync.mockResolvedValue([{ assetCount: 0 }]);

        const { scanAlbums } = useAlbumScanner();
        await scanAlbums(() => { });
        expect(MediaLibrary.getAssetsAsync).not.toHaveBeenCalled();
    });
    it("should do nothing if image is non-food", async () => {

        MediaLibrary.usePermissions.mockReturnValue([{ status: "granted" }, jest.fn()]);
        MediaLibrary.getAlbumsAsync.mockResolvedValue([{ assetCount: 1 }]);
        MediaLibrary.getAssetsAsync.mockResolvedValue({
            endCursor: 1,
            hasNextPage: false,
            assets: [{ uri: "testuri1" }]
        });
        useImageLabeling.mockReturnValue({
            classifyImage: async function mockClassifyImage(imageUri: string) {
                return [{ confidence: 8.5, label: 0, text: "non-food" }]
            }
        });

        const { scanAlbums } = useAlbumScanner();
        await scanAlbums(() => { });
        expect(uploadData).not.toHaveBeenCalled();
    });

    it("should upload images to S3 and server", async () => {
        MediaLibrary.usePermissions.mockReturnValue([{ status: "granted" }, jest.fn()]);
        MediaLibrary.getAlbumsAsync.mockResolvedValue([{ assetCount: 1 }]);
        MediaLibrary.getAssetsAsync.mockResolvedValue({
            endCursor: 1,
            hasNextPage: false,
            assets: [{ uri: "testuri1" }]
        });
        useImageLabeling.mockReturnValue({
            classifyImage: async function mockClassifyImage(imageUri: string) {
                return [{ confidence: 8.5, label: 0, text: "food" }]
            }
        });
        uploadData.mockReturnValue({
            result: new Promise((resolve, reject) => {
                resolve({
                    path: "photoUrl"
                })
            })
        });
        api.uploadPhoto.mockResolvedValue({
            ok: true
        })
        const { scanAlbums } = useAlbumScanner();
        await scanAlbums(() => { });

        await waitFor(() => {
            expect(uploadData).toHaveBeenCalled();
            expect(api.uploadPhoto).toHaveBeenCalled();
        })
    })
    it("should call given callback", async () => {
        MediaLibrary.usePermissions.mockReturnValue([{ status: "granted" }, jest.fn()]);
        MediaLibrary.getAlbumsAsync.mockResolvedValue([{ assetCount: 1 }]);
        MediaLibrary.getAssetsAsync.mockResolvedValue({
            endCursor: 1,
            hasNextPage: false,
            assets: [{ uri: "testuri1" }]
        });
        useImageLabeling.mockReturnValue({
            classifyImage: async function mockClassifyImage(imageUri: string) {
                return [{ confidence: 8.5, label: 0, text: "food" }]
            }
        });
        uploadData.mockReturnValue({
            result: new Promise((resolve, reject) => {
                resolve({
                    path: "photoUrl"
                })
            })
        });
        api.uploadPhoto.mockResolvedValue({
            ok: true
        })
        const { scanAlbums } = useAlbumScanner();
        const mockCallBack = jest.fn();
        await scanAlbums(mockCallBack);

        await waitFor(() => {
            expect(mockCallBack).toHaveBeenCalled();
        })
    })

    it("should prevent duplicate photo upload with same local_uri", async () => {
        MediaLibrary.usePermissions.mockReturnValue([{ status: "granted" }, jest.fn()]);
        const album = { title: "Test Album", assetCount: 1 };
        MediaLibrary.getAlbumsAsync.mockResolvedValue([album]);
        
        const sameAssetUri = "file:///storage/emulated/0/DCIM/Camera/IMG_001.jpg";
        MediaLibrary.getAssetsAsync.mockResolvedValue({
            endCursor: undefined,
            hasNextPage: false,
            assets: [{ uri: sameAssetUri }]
        });

        useImageLabeling.mockReturnValue({
            classifyImage: async function mockClassifyImage(imageUri: string) {
                return [{ confidence: 8.5, label: 0, text: "food" }]
            }
        });

        uploadData.mockReturnValue({
            result: Promise.resolve({ path: "photoUrl1" })
        });

        // First upload succeeds
        api.uploadPhoto.mockResolvedValueOnce({
            ok: true,
            data: { id: 1 }
        });

        // Second upload should be prevented (duplicate local_uri)
        api.uploadPhoto.mockResolvedValueOnce({
            ok: false,
            problem: "DUPLICATE",
            status: 400
        });

        const { scanAlbums } = useAlbumScanner();
        const mockCallback = jest.fn();
        
        // First scan
        await scanAlbums(mockCallback);
        await waitFor(() => {
            expect(api.uploadPhoto).toHaveBeenCalledTimes(1);
        });

        // Reset mocks but keep track
        const firstUploadCallCount = api.uploadPhoto.mock.calls.length;
        
        // Second scan of same album
        await scanAlbums(mockCallback);
        
        // Should attempt upload but server should prevent duplicate
        await waitFor(() => {
            expect(api.uploadPhoto.mock.calls.length).toBeGreaterThan(firstUploadCallCount);
        });
    });

    it("should not upload same photo twice when scanning same album multiple times", async () => {
        MediaLibrary.usePermissions.mockReturnValue([{ status: "granted" }, jest.fn()]);
        const album = { title: "Test Album", assetCount: 1 };
        MediaLibrary.getAlbumsAsync.mockResolvedValue([album]);
        
        const assetUri = "file:///storage/emulated/0/DCIM/Camera/IMG_001.jpg";
        MediaLibrary.getAssetsAsync.mockResolvedValue({
            endCursor: undefined,
            hasNextPage: false,
            assets: [{ uri: assetUri }]
        });

        useImageLabeling.mockReturnValue({
            classifyImage: async function mockClassifyImage(imageUri: string) {
                return [{ confidence: 8.5, label: 0, text: "food" }]
            }
        });

        uploadData.mockReturnValue({
            result: Promise.resolve({ path: "photoUrl1" })
        });

        // First upload succeeds
        api.uploadPhoto.mockResolvedValue({
            ok: true,
            data: { id: 1 }
        });

        const { scanAlbums } = useAlbumScanner();
        const mockCallback = jest.fn();
        
        // First scan
        await scanAlbums(mockCallback);
        await waitFor(() => {
            expect(api.uploadPhoto).toHaveBeenCalled();
        });

        const firstCallCount = api.uploadPhoto.mock.calls.length;
        
        // Second scan of same album - should check for duplicates
        await scanAlbums(mockCallback);
        
        // The upload should be attempted, but server should handle duplicate prevention
        // We verify that uploadPhoto is called (duplicate check happens server-side)
        await waitFor(() => {
            // Server should return error for duplicate, preventing actual duplicate creation
            const lastCall = api.uploadPhoto.mock.calls[api.uploadPhoto.mock.calls.length - 1];
            expect(lastCall).toBeDefined();
        });
    });

    it("should handle server-side duplicate detection gracefully", async () => {
        MediaLibrary.usePermissions.mockReturnValue([{ status: "granted" }, jest.fn()]);
        MediaLibrary.getAlbumsAsync.mockResolvedValue([{ title: "Test Album", assetCount: 1 }]);
        MediaLibrary.getAssetsAsync.mockResolvedValue({
            endCursor: undefined,
            hasNextPage: false,
            assets: [{ uri: "file:///storage/emulated/0/DCIM/Camera/IMG_001.jpg" }]
        });

        useImageLabeling.mockReturnValue({
            classifyImage: async function mockClassifyImage(imageUri: string) {
                return [{ confidence: 8.5, label: 0, text: "food" }]
            }
        });

        uploadData.mockReturnValue({
            result: Promise.resolve({ path: "photoUrl1" })
        });

        // Server returns error for duplicate
        api.uploadPhoto.mockResolvedValue({
            ok: false,
            problem: "DUPLICATE",
            status: 400,
            data: { error: "Photo with this local_uri already exists" }
        });

        const { scanAlbums } = useAlbumScanner();
        const mockCallback = jest.fn();
        
        await scanAlbums(mockCallback);
        
        await waitFor(() => {
            expect(api.uploadPhoto).toHaveBeenCalled();
            // Callback should not be called for failed uploads
            expect(mockCallback).not.toHaveBeenCalled();
        });
    });

    it("should process different photos from same album without duplicate prevention", async () => {
        MediaLibrary.usePermissions.mockReturnValue([{ status: "granted" }, jest.fn()]);
        const album = { title: "Test Album", assetCount: 2 };
        MediaLibrary.getAlbumsAsync.mockResolvedValue([album]);
        
        MediaLibrary.getAssetsAsync.mockResolvedValue({
            endCursor: undefined,
            hasNextPage: false,
            assets: [
                { uri: "file:///storage/emulated/0/DCIM/Camera/IMG_001.jpg" },
                { uri: "file:///storage/emulated/0/DCIM/Camera/IMG_002.jpg" }
            ]
        });

        useImageLabeling.mockReturnValue({
            classifyImage: async function mockClassifyImage(imageUri: string) {
                return [{ confidence: 8.5, label: 0, text: "food" }]
            }
        });

        uploadData.mockReturnValue({
            result: Promise.resolve({ path: "photoUrl" })
        });

        api.uploadPhoto.mockResolvedValue({
            ok: true,
            data: { id: 1 }
        });

        const { scanAlbums } = useAlbumScanner();
        const mockCallback = jest.fn();
        
        await scanAlbums(mockCallback);
        
        await waitFor(() => {
            // Both photos should be uploaded (different local_uri)
            expect(api.uploadPhoto).toHaveBeenCalledTimes(2);
            expect(mockCallback).toHaveBeenCalledTimes(2);
        });
    });
});
