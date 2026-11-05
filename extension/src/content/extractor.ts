
export interface FormField {
  index: number;
  tagName: string;
  type: string;
  label: string;
  placeholder: string;
  name: string;
  id: string;
  required: boolean;
  options?: string[];
}

export function extractFields(): FormField[] {
  const elements = Array.from(
    document.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >("input, textarea, select")
  );

  return elements
    .filter((element) => {
      const type = element instanceof HTMLInputElement
        ? element.type.toLowerCase()
        : "";

      return ![
        "hidden",
        "submit",
        "button",
        "reset",
        "image"
      ].includes(type);
    })
    .map((element, index) => {
      const labels = element.labels
        ? Array.from(element.labels)
            .map((label) => label.innerText.trim())
            .join(" ")
        : "";

      const label =
        labels ||
        element.getAttribute("aria-label") ||
        element.getAttribute("placeholder") ||
        element.getAttribute("name") ||
        element.id ||
        "";

      const options =
        element instanceof HTMLSelectElement
          ? Array.from(element.options)
              .map((option) => option.text.trim())
              .filter(Boolean)
          : undefined;

      return {
        index,
        tagName: element.tagName.toLowerCase(),
        type:
          element instanceof HTMLInputElement
            ? element.type
            : element.tagName.toLowerCase(),
        label,
        placeholder: element.getAttribute("placeholder") || "",
        name: element.getAttribute("name") || "",
        id: element.id,
        required: element.required,
        options
      };
    });
}
