import * as MediaLibrary from "expo-media-library";
import { useImageClassifier } from "./useImageClassifier";
import { uploadData } from "aws-amplify/storage";
import { api } from "../api";
import { getImage } from "app/utils/imagenameFromAsseturi";

export function useAlbumScanner() {
    const { isFoodImage } = useImageClassifier();
    const [permissionResponse, requestPermission] = MediaLibrary.usePermissions(
        { granularPermissions: ['photo'] }
    );

    async function sendImageToS3(albumTitle: string, asset: MediaLibrary.Asset) {
        const filename = getImage(asset);
        console.log(`Trying to send image to S3: ${filename}`);

        const response = await fetch(asset.uri);
        const blob = await response.blob();

        let photoUrl: string = "";
        try {
            let s3_result = await uploadData({
                path: ({ identityId }) => `protected/${identityId}/album/${albumTitle}/${filename}`,
                data: blob,
            }).result;
            photoUrl = s3_result.path;
            console.log('Sent image to S3: ', s3_result);
        } catch (error) {
            console.log('Error trying to send image to S3: ', error);
        }
        return { photoUrl, imageBlob: blob };
    }

    async function processImage(album: MediaLibrary.Album, asset: MediaLibrary.Asset, onFoodFound: (asset: MediaLibrary.Asset) => void) {
        const isFood = await isFoodImage(asset.uri);
        if (!isFood) {
            return;
        }

        const { photoUrl, imageBlob } = await sendImageToS3(album.title, asset);
        if (photoUrl == "") {
            return;
        }

        const response = await api.uploadPhoto(photoUrl, asset.uri, imageBlob);
        if (response.ok) {
            console.log("Sent photo url to server");
            onFoodFound(asset);
        } else {
            console.error("Failed to send photo url to server:", response.problem);
        }
    }

    async function scanAlbum(album: MediaLibrary.Album, onFoodFound: (asset: MediaLibrary.Asset) => void) {
        let endCursor = undefined;
        let hasNextPage = true;

        console.log(`Processing album: ${album.title}`);
        while (hasNextPage) {
            const result = await MediaLibrary.getAssetsAsync({
                album,
                first: 100,
                after: endCursor,
                sortBy: ['creationTime'],
            });
            endCursor = result.endCursor;
            hasNextPage = result.hasNextPage;

            for (const asset of result.assets) {
                await processImage(album, asset, onFoodFound);
            }
        }
    }

    async function scanAlbums(onFoodFound: (asset: MediaLibrary.Asset) => void) {
        console.log(permissionResponse);
        if (permissionResponse?.status !== 'granted') {
            await requestPermission();
        }
        const fetchedAlbums = await MediaLibrary.getAlbumsAsync({
            includeSmartAlbums: true,
        });
        for (const album of fetchedAlbums) {
            if (album.assetCount == 0) {
                continue; // skip empty albums
            }
            scanAlbum(album, onFoodFound);
        }
    }

    return { scanAlbums };
};