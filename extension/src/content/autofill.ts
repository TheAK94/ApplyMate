
export interface AutofillItem {
  fieldId: string;
  value: string;
}

export interface AutofillResult {
  filled: string[];
  skipped: string[];
}

export function autofillFields(
  items: AutofillItem[],
  detectedFields: {
    fieldId: string;
    id: string;
    name: string;
    type: string;
  }[]
): AutofillResult {
  const result: AutofillResult = {
    filled: [],
    skipped: []
  };

  for (const item of items) {
    const field = detectedFields.find(
      field => field.fieldId === item.fieldId
    );

    if (!field) {
      result.skipped.push(item.fieldId);
      continue;
    }

    let element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null =
      null;

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

        const matchingCandidate = candidates.find(candidate => {
            return (
            candidate instanceof HTMLInputElement ||
            candidate instanceof HTMLTextAreaElement ||
            candidate instanceof HTMLSelectElement
            );
        });

        if (
            matchingCandidate instanceof HTMLInputElement ||
            matchingCandidate instanceof HTMLTextAreaElement ||
            matchingCandidate instanceof HTMLSelectElement
        ) {
            element = matchingCandidate;
        }
    }

    if (!element || element.disabled) {
        result.skipped.push(item.fieldId);
        continue;
    }

    if (
    (element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement) &&
    element.readOnly
    ) {
        result.skipped.push(item.fieldId);
        continue;
    }

    if (element instanceof HTMLInputElement) {
      if (
        ["checkbox", "radio", "file", "hidden", "submit", "button"].includes(
          element.type
        )
      ) {
        result.skipped.push(item.fieldId);
        continue;
      }
    }

    // Never overwrite an existing value.
    if (element.value.trim() !== "") {
      result.skipped.push(item.fieldId);
      continue;
    }

    // Use the native setter to support React-controlled inputs.
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

    setter.call(element, item.value);

    element.dispatchEvent(
      new Event("input", { bubbles: true })
    );

    element.dispatchEvent(
      new Event("change", { bubbles: true })
    );

    result.filled.push(item.fieldId);
  }

  return result;
}
