import type { PixelizerOptions, RawImageData } from "./pixelizer";
import { PixelizerGenerator } from "./pixelizer.js";
import {
  Button,
  FileInput,
  RadioGroup,
  RangeNumberPair,
  Status,
} from "./scaffold.js";

type WebProcessOptions = Omit<PixelizerOptions, "fixPaletteData"> & {
  fixPaletteFile: File | null;
};

class BrowserImageProcessor {
  lib: PixelizerGenerator;

  constructor() {
    this.lib = new PixelizerGenerator();
  }

  async loadImageElementFromFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        if (!e.target?.result || typeof e.target.result !== "string") {
          return reject(new Error("Could not read file as data URL"));
        }
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Image failed to load"));
        img.src = e.target.result;
      };
      fileReader.onerror = () => reject(new Error("FileReader error"));
      fileReader.readAsDataURL(file);
    });
  }

  extractImageData(img: HTMLImageElement): RawImageData {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    ctx.drawImage(img, 0, 0);
    const { data, width, height } = ctx.getImageData(
      0,
      0,
      img.width,
      img.height,
    );
    return { data, width, height };
  }

  convertImageDataToDataUrl(imageData: RawImageData): string {
    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");

    const imgDataObj = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height,
    );

    ctx.putImageData(imgDataObj, 0, 0);
    return canvas.toDataURL("image/png");
  }

  async processImageFile(mainFile: File, options: WebProcessOptions) {
    const mainImage = await this.loadImageElementFromFile(mainFile);
    const mainImageData = this.extractImageData(mainImage);

    let fixPaletteData: RawImageData | null = null;
    if (options.fixPaletteFile) {
      const paletteImage = await this.loadImageElementFromFile(
        options.fixPaletteFile,
      );
      fixPaletteData = this.extractImageData(paletteImage);
    }

    const libOptions: PixelizerOptions = { ...options, fixPaletteData };
    const result = this.lib.processImage(mainImageData, libOptions);
    const dataUrl = this.convertImageDataToDataUrl(result.finalImageData);
    return { dataUrl, paletteRGB: result.paletteRGB };
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const imageInputEl = document.getElementById(
    "image-input",
  ) as HTMLInputElement;
  const fixPaletteInputEl = document.getElementById(
    "fix-palette-input",
  ) as HTMLInputElement;
  const customPaletteEl = document.getElementById(
    "custom-palette",
  ) as HTMLTextAreaElement;
  const processBtnEl = document.getElementById(
    "process-btn",
  ) as HTMLButtonElement;
  const statusEl = document.getElementById("status") as HTMLElement;
  const spinnerEl = document.getElementById("spinner") as HTMLElement;
  const outputContainer = document.getElementById(
    "output-container",
  ) as HTMLElement;
  const resultImage = document.getElementById(
    "result-image",
  ) as HTMLImageElement;
  const resultPalette = document.getElementById(
    "result-palette",
  ) as HTMLElement;
  const nColorsInput = document.getElementById("n-colors") as HTMLInputElement;
  const nColorsSlider = document.getElementById(
    "n-colors-slider",
  ) as HTMLInputElement;
  const relativeScaleInput = document.getElementById(
    "relative-scale",
  ) as HTMLInputElement;
  const relativeScaleSlider = document.getElementById(
    "relative-scale-slider",
  ) as HTMLInputElement;
  const weightCInput = document.getElementById("weight-c") as HTMLInputElement;
  const weightCSlider = document.getElementById(
    "weight-c-slider",
  ) as HTMLInputElement;
  const outputSizeInput = document.getElementById(
    "output-size",
  ) as HTMLInputElement;
  const noDownscaleCheckbox = document.getElementById(
    "no-downscale",
  ) as HTMLInputElement;
  const enablePixelizationCheckbox = document.getElementById(
    "enable-pixelization",
  ) as HTMLInputElement;
  const kmeansOptions = document.getElementById(
    "kmeans-options",
  ) as HTMLElement;
  const customOptions = document.getElementById(
    "custom-options",
  ) as HTMLElement;

  const allElements = [
    imageInputEl,
    fixPaletteInputEl,
    customPaletteEl,
    processBtnEl,
    statusEl,
    spinnerEl,
    outputContainer,
    resultImage,
    resultPalette,
    nColorsInput,
    nColorsSlider,
    relativeScaleInput,
    relativeScaleSlider,
    weightCInput,
    weightCSlider,
    outputSizeInput,
    noDownscaleCheckbox,
    enablePixelizationCheckbox,
    kmeansOptions,
    customOptions,
  ];
  if (allElements.some((el) => !el)) {
    throw new Error(
      "A required DOM element was not found. Check your HTML IDs.",
    );
  }

  const processButton = new Button(processBtnEl);
  const status = new Status(statusEl);
  const imageFileInput = new FileInput(imageInputEl);
  const radioGroup = new RadioGroup("#palette-mode-group", "palette-mode");
  new RangeNumberPair(nColorsSlider, nColorsInput);
  new RangeNumberPair(relativeScaleSlider, relativeScaleInput);
  new RangeNumberPair(weightCSlider, weightCInput);

  const processor = new BrowserImageProcessor();
  let inputFileName = "image.png";

  radioGroup.onChange((val) => {
    kmeansOptions.classList.toggle("hidden", val !== "kmeans");
    customOptions.classList.toggle("hidden", val !== "custom");
  });

  enablePixelizationCheckbox.addEventListener("change", () => {
    document
      .getElementById("pixelization-options")
      ?.classList.toggle("hidden", !enablePixelizationCheckbox.checked);
  });

  imageFileInput.onChange((files) => {
    const file = files?.[0];
    if (!file) return;
    inputFileName = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      outputContainer.innerHTML = "";
      const result = e.target?.result;
      if (typeof result !== "string") return;
      const preview = new Image();
      preview.src = result;
      outputContainer.appendChild(preview);
      status.update("Image loaded. Adjust settings and process.");
    };
    reader.readAsDataURL(file);
  });

  processButton.onClick(handleProcessClick);

  async function handleProcessClick(): Promise<void> {
    const file = imageInputEl.files?.[0];
    if (!file) {
      status.update("Error: Please upload an image first.", true);
      return;
    }

    const nColors = parseInt(nColorsInput.value, 10);
    const paletteMode = radioGroup.value as "kmeans" | "custom";
    const customPaletteStr = customPaletteEl.value;

    if (Number.isNaN(nColors) || nColors < 2 || nColors > 64) {
      status.update("Error: Number of colors must be between 2 and 64.", true);
      return;
    }
    if (paletteMode === "custom" && !customPaletteStr.trim()) {
      status.update("Error: Custom palette cannot be empty.", true);
      return;
    }

    toggleLoadingState(true);
    status.update("Processing started...");

    try {
      const processingOptions: WebProcessOptions = {
        paletteMode,
        nColors,
        shouldPixelize: enablePixelizationCheckbox.checked,
        relativeScale: parseFloat(relativeScaleInput.value),
        weightC: parseFloat(weightCInput.value),
        outputSize: outputSizeInput.value
          ? parseInt(outputSizeInput.value, 10)
          : null,
        fixPaletteFile: fixPaletteInputEl.files?.[0] || null,
        noDownscale: noDownscaleCheckbox.checked,
        customPaletteStr,
      };

      status.update("Processing...");
      await new Promise<void>((resolve) => setTimeout(resolve, 10));

      const result = await processor.processImageFile(file, processingOptions);

      renderResultImageAndPalette(
        result.dataUrl,
        result.paletteRGB,
        inputFileName,
        processingOptions.shouldPixelize,
      );
      status.update("Success! Processing complete.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(err);
      status.update(`Error: ${msg}`, true);
    } finally {
      toggleLoadingState(false);
    }
  }

  function toggleLoadingState(isLoading: boolean): void {
    processButton.setDisabled(isLoading);
    spinnerEl.classList.toggle("hidden", !isLoading);
  }

  function renderResultImageAndPalette(
    dataUrl: string,
    palette: number[][],
    fileName: string,
    pixelized: boolean,
  ): void {
    outputContainer.innerHTML = "";
    resultImage.src = dataUrl;
    resultImage.classList.remove("hidden");
    outputContainer.appendChild(resultImage);

    resultPalette.innerHTML = "";
    palette.forEach((rgb) => {
      const d = document.createElement("div");
      d.className = "palette-color";
      d.style.backgroundColor = `rgb(${rgb[0]!}, ${rgb[1]!}, ${rgb[2]!})`;
      d.title = `#${rgb
        .map((c) => c.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase()}`;
      resultPalette.appendChild(d);
    });
    outputContainer.appendChild(resultPalette);

    const a = document.createElement("a");
    a.id = "download-link";
    a.href = dataUrl;
    const baseName = fileName.replace(/\.[^.]+$/, "");
    a.download = (pixelized ? "pixelated_" : "quantized_") + baseName + ".png";
    a.textContent = "Download Image";
    outputContainer.appendChild(a);
  }
});
