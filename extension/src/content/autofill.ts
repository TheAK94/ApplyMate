
export interface AutofillItem {
  fieldId: string;
  value: string;
}

export interface AutofillFieldResult {
  fieldId: string;
  status: "filled" | "skipped" | "partial";
  reason: string;
}

export interface AutofillResult {
  filled: string[];
  skipped: string[];
  details: AutofillFieldResult[];
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
    skipped: [],
    details: []
  };

  function markFilled(fieldId: string, reason = "Successfully filled.") {
    result.filled.push(fieldId);
    result.details.push({
      fieldId,
      status: "filled",
      reason
    });
  }

  function markSkipped(fieldId: string, reason: string) {
    result.skipped.push(fieldId);
    result.details.push({
      fieldId,
      status: "skipped",
      reason
    });
  }

  function markPartial(fieldId: string, reason: string) {
    result.skipped.push(fieldId);
    result.details.push({
      fieldId,
      status: "partial",
      reason
    });
  }

  for (const item of items) {
    try {
      const field = detectedFields.find(
        field => field.fieldId === item.fieldId
      );

      if (!field) {
        markSkipped(item.fieldId, "Field was not found in the detected form.");
        continue;
      }

      if (!item.value.trim()) {
        markSkipped(item.fieldId, "No value was provided.");
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

        if (inputs.length === 0) {
          markSkipped(item.fieldId, "Choice group was not found.");
          continue;
        }

        const requestedValues =
          field.type === "checkbox"
            ? item.value.split(",").map(value => value.trim().toLowerCase()).filter(Boolean)
            : [item.value.trim().toLowerCase()];

        if (field.type === "radio") {
          const selectedInput = inputs.find(input => input.checked);

          if (selectedInput) {
            const selectedValue = selectedInput.value.trim().toLowerCase();
            const selectedLabel =
              selectedInput.labels?.[0]?.textContent?.trim().toLowerCase() || "";

            const alreadyCorrect = requestedValues.includes(selectedValue) ||
              requestedValues.includes(selectedLabel);

            if (alreadyCorrect) {
              markFilled(item.fieldId, "The correct option was already selected.");
            } else {
              markSkipped(item.fieldId, "A different radio option is already selected.");
            }

            continue;
          }
        }

        let matchedCount = 0;
        let newlySelectedCount = 0;

        for (const input of inputs) {
          const inputValue = input.value.trim().toLowerCase();
          const inputLabel =
            input.labels?.[0]?.textContent?.trim().toLowerCase() || "";

          const shouldSelect = requestedValues.some(
            value => value === inputValue || value === inputLabel
          );

          if (!shouldSelect) continue;

          if (input.disabled) continue;

          matchedCount++;

          if (!input.checked) {
            const setter = Object.getOwnPropertyDescriptor(
              HTMLInputElement.prototype,
              "checked"
            )?.set;

            if (!setter) continue;

            setter.call(input, true);
            dispatchEvents(input);
            newlySelectedCount++;
          }

          if (field.type === "radio") break;
        }

        if (matchedCount === 0) {
          markSkipped(item.fieldId, "No matching enabled option was found.");
        } else if (
          field.type === "checkbox" &&
          matchedCount < requestedValues.length
        ) {
          markPartial(
            item.fieldId,
            "Some requested checkbox options could not be matched."
          );
        } else {
          markFilled(
            item.fieldId,
            newlySelectedCount > 0
              ? "Matching options selected."
              : "The matching options were already selected."
          );
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

      if (!element || !element.isConnected) {
        markSkipped(item.fieldId, "Field element could not be found.");
        continue;
      }

      if (element.disabled) {
        markSkipped(item.fieldId, "Field is disabled.");
        continue;
      }

      if (
        (element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement) &&
        element.readOnly
      ) {
        markSkipped(item.fieldId, "Field is read-only.");
        continue;
      }

      if (
        element instanceof HTMLInputElement &&
        ["checkbox", "radio", "file", "hidden", "submit", "button"].includes(
          element.type
        )
      ) {
        markSkipped(item.fieldId, "Unsupported input type.");
        continue;
      }

      // Never overwrite existing values.
      if (element.value.trim() !== "") {
        markSkipped(item.fieldId, "Field already contains a value.");
        continue;
      }

      let valueToSet = item.value;

      // Handle dropdowns.
      if (element instanceof HTMLSelectElement) {
        const option = Array.from(element.options).find(
          option =>
            !option.disabled &&
            !option.parentElement?.matches("optgroup:disabled") &&
            (
              option.value.toLowerCase() === item.value.trim().toLowerCase() ||
              option.text.trim().toLowerCase() === item.value.trim().toLowerCase()
            )
        );

        if (!option) {
          markSkipped(item.fieldId, "No matching dropdown option was found.");
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
        markSkipped(item.fieldId, "Could not update this field.");
        continue;
      }

      setter.call(element, valueToSet);
      dispatchEvents(element);

      markFilled(item.fieldId);

    } catch (error) {
      console.error(`ApplyMate: Failed to fill ${item.fieldId}`, error);
      markSkipped(item.fieldId, "An unexpected error occurred while filling this field.");
    }
  }

  return result;
}
