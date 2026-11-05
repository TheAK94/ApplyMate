
export interface AutofillItem {
  fieldId: string;
  value: string;
}

export interface AutofillResult {
  filled: string[];
  skipped: string[];
}

interface DetectedField {
  fieldId: string;
  id: string;
  name: string;
  type: string;
  kind: "field" | "choice-group";
}

export function autofillFields(
  items: AutofillItem[],
  detectedFields: DetectedField[]
): AutofillResult {

  function dispatchEvents(element: HTMLElement) {
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  const result: AutofillResult = {
    filled: [],
    skipped: []
  };

  for (const item of items) {
    const field = detectedFields.find(
      field => field.fieldId === item.fieldId
    );

    if (!field || !item.value.trim()) {
      result.skipped.push(item.fieldId);
      continue;
    }

    // Handle radio and checkbox groups.
    if (field.kind === "choice-group") {
      const inputs = Array.from(
        document.getElementsByName(field.name)
      ).filter(
        (element): element is HTMLInputElement =>
          element instanceof HTMLInputElement &&
          element.type === field.type
      );

      const requestedValues =
        field.type === "checkbox"
          ? item.value.split(",").map(value => value.trim().toLowerCase()).filter(Boolean)
          : [item.value.trim().toLowerCase()];

      let matched = false;

      for (const input of inputs) {
        if (input.disabled) continue;

        const inputValue = input.value.trim().toLowerCase();
        const inputLabel =
          input.labels?.[0]?.textContent?.trim().toLowerCase() || "";

        const shouldSelect = requestedValues.some(
          value => value === inputValue || value === inputLabel
        );

        if (!shouldSelect) continue;

        const setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "checked"
        )?.set;

        if (!setter) continue;

        // Don't deselect existing checkbox selections.
        if (!input.checked) {
          setter.call(input, true);
          dispatchEvents(input);
        }

        matched = true;

        // Radio groups only need one selection.
        if (field.type === "radio") break;
      }

      if (matched) {
        result.filled.push(item.fieldId);
      } else {
        result.skipped.push(item.fieldId);
      }

      continue;
    }

    // Locate normal fields.
    let element:
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
      | null = null;

    if (field.id) {
      const found = document.getElementById(field.id);

      if (
        found instanceof HTMLInputElement ||
        found instanceof HTMLTextAreaElement ||
        found instanceof HTMLSelectElement
      ) {
        element = found;
      }
    }

    if (!element && field.name) {
      const candidates = Array.from(
        document.getElementsByName(field.name)
      );

      const candidate = candidates.find(
        (item): item is HTMLInputElement |
          HTMLTextAreaElement |
          HTMLSelectElement =>
          item instanceof HTMLInputElement ||
          item instanceof HTMLTextAreaElement ||
          item instanceof HTMLSelectElement
      );

      if (candidate) element = candidate;
    }

    if (
      !element ||
      element.disabled ||
      (
        (element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement) &&
        element.readOnly
      )
    ) {
      result.skipped.push(item.fieldId);
      continue;
    }

    if (
      element instanceof HTMLInputElement &&
      ["checkbox", "radio", "file", "hidden", "submit", "button"].includes(
        element.type
      )
    ) {
      result.skipped.push(item.fieldId);
      continue;
    }

    // Never overwrite existing values.
    if (element.value.trim() !== "") {
      result.skipped.push(item.fieldId);
      continue;
    }

    let valueToSet = item.value;

    // Handle dropdowns.
    if (element instanceof HTMLSelectElement) {
      const option = Array.from(element.options).find(
        option =>
          !option.disabled &&
          (
            option.value.toLowerCase() === item.value.toLowerCase() ||
            option.text.trim().toLowerCase() === item.value.toLowerCase()
          )
      );

      if (!option) {
        result.skipped.push(item.fieldId);
        continue;
      }

      valueToSet = option.value;
    }

    const prototype =
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : element instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;

    const setter = Object.getOwnPropertyDescriptor(
      prototype,
      "value"
    )?.set;

    if (!setter) {
      result.skipped.push(item.fieldId);
      continue;
    }

    setter.call(element, valueToSet);
    dispatchEvents(element);

    result.filled.push(item.fieldId);
  }

  return result;
}
