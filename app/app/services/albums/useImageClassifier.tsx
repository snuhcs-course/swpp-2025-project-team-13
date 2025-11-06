import { useImageLabeling } from "@infinitered/react-native-mlkit-image-labeling";

export function useImageClassifier() {
  const classifier = useImageLabeling("foodNonFood");

  async function waitForClassifier() {
    while (!classifier) {
      await new Promise((r) => setTimeout(r, 100));
    }
    return classifier;
  }

  async function isFoodImage(imageUri: string) {
    try {
      const readyClassifier = await waitForClassifier();

      const result = await readyClassifier.classifyImage(imageUri);
      console.log(result);
      return result.length >=1 && result[0].text === "food";
    } catch (err) {
      console.error("Classification failed", err);
      return null;
    }
  };

  return { isFoodImage };
};
