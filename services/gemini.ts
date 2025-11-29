import { GoogleGenAI, Type } from "@google/genai";
import { DinoQuestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using gemini-2.5-flash for logic and text generation
const TEXT_MODEL = "gemini-2.5-flash";
// Using gemini-2.5-flash-image for image generation as per requirements
const IMAGE_MODEL = "gemini-2.5-flash-image";

const DINO_CATEGORIES = [
  "Sauropod (long-necked herbivore)",
  "Ceratopsian (horned dinosaur)",
  "Ankylosaur or Nodosaur (armored dinosaur)",
  "Stegosaur (plated dinosaur)",
  "Hadrosaur or Iguanodontian (ornithopod)",
  "Small to medium Theropod (raptor or similar)",
  "Large Theropod (carnivore, excluding Spinosaurus/T-Rex)",
  "Pachycephalosaur (dome-headed)",
  "Abelisaurid (short-armed carnivore)",
  "Dinosaur from the Triassic period",
  "Dinosaur from the Early Jurassic period"
];

export const generateDinoData = async (): Promise<DinoQuestion> => {
  // Select a random category to force variety
  const category = DINO_CATEGORIES[Math.floor(Math.random() * DINO_CATEGORIES.length)];

  const prompt = `
    Generate a dinosaur trivia question suitable for a 14-year-old.
    
    Target Category: ${category}.
    
    Task:
    1. Pick a random dinosaur that fits the target category.
    2. IMPORTANT: Do NOT use Spinosaurus, Tyrannosaurus Rex, Triceratops, or Velociraptor. We want to see variety (e.g., Carnotaurus, Parasaurolophus, Ankylosaurus, Baryonyx, Diplodocus, etc.).
    3. Provide the correct name.
    4. Provide 3 plausible but incorrect dinosaur names (distractors) that sound similar or are from the same era.
    5. Provide a short interesting fact.
    6. Provide a detailed visual description suitable for generating a photorealistic image.
  `;

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          correctName: { type: Type.STRING },
          distractors: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          funFact: { type: Type.STRING },
          visualDescription: { type: Type.STRING },
        },
        required: ["correctName", "distractors", "funFact", "visualDescription"],
      },
    },
  });

  if (!response.text) {
    throw new Error("Failed to generate dinosaur data");
  }

  return JSON.parse(response.text) as DinoQuestion;
};

export const generateDinoImage = async (dinoName: string, description: string): Promise<string> => {
  // We use the image model to generate a visual representation
  // Updated prompt to ensure full body visibility and natural setting
  const prompt = `A cinematic, photorealistic, highly detailed wide shot of a ${dinoName} dinosaur in a prehistoric natural environment. ${description}. Full body must be entirely visible within the frame. 4k resolution. Scientific accuracy.`;

  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: {
      parts: [
        { text: prompt }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9"
      }
    }
  });

  // Extract image from response
  // The response structure for image generation often returns the image in the parts
  if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  }

  throw new Error("No image generated.");
};