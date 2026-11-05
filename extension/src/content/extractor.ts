
export interface FormOption {
  label: string;
  value: string;
  disabled: boolean;
}

export interface FormField {
  fieldId: string;
  kind: "field" | "choice-group";
  tagName: string;
  type: string;
  label: string;
  placeholder: string;
  name: string;
  id: string;
  required: boolean;
  disabled: boolean;
  options?: FormOption[];
}

export function extractFields(): FormField[] {
  const elements = Array.from(
    document.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >("input, textarea, select")
  );

  const ignoredTypes = [
    "hidden",
    "submit",
    "button",
    "reset",
    "image"
  ];

  // Extract an element's accessible label.
  const getLabel = (element: HTMLElement): string => {
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement
    ) {
      const labels = Array.from(element.labels || [])
        .map(label => label.innerText.trim())
        .filter(Boolean);

      if (labels.length) return labels.join(" ");
    }

    const labelledBy = element.getAttribute("aria-labelledby");

    if (labelledBy) {
      const text = labelledBy
        .split(/\s+/)
        .map(id => document.getElementById(id)?.textContent?.trim())
        .filter(Boolean)
        .join(" ");

      if (text) return text;
    }

    const ariaLabel = element.getAttribute("aria-label");

    if (ariaLabel) return ariaLabel;

    const parentLabel = element.closest("label")?.textContent?.trim();

    if (parentLabel) return parentLabel;

    return (
      element.getAttribute("placeholder") ||
      element.getAttribute("name") ||
      element.id ||
      ""
    );
  };

  // Extract options from native select elements.
  const getSelectOptions = (
    element: HTMLSelectElement
  ): FormOption[] => {
    return Array.from(element.options)
      .filter(option => option.value !== "")
      .map(option => ({
        label: option.text.trim(),
        value: option.value,
        disabled: option.disabled
      }));
  };

  const validElements = elements.filter(element => {
    if (
      element instanceof HTMLInputElement &&
      ignoredTypes.includes(element.type.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  // Separate radio and checkbox controls from normal fields.
  const normalFields = validElements.filter(element => {
    return !(
      element instanceof HTMLInputElement &&
      ["radio", "checkbox"].includes(element.type)
    );
  });

  const choiceFields = validElements.filter(element => {
    return (
      element instanceof HTMLInputElement &&
      ["radio", "checkbox"].includes(element.type)
    );
  }) as HTMLInputElement[];

  const results: FormField[] = normalFields.map((element, index) => {
    const type =
      element instanceof HTMLInputElement
        ? element.type
        : element.tagName.toLowerCase();

    return {
      fieldId: element.id
        ? `field-${element.id}`
        : `field-${element.name || type}-${index}`,

      kind: "field",
      tagName: element.tagName.toLowerCase(),
      type,
      label: getLabel(element),
      placeholder: element.getAttribute("placeholder") || "",
      name: element.getAttribute("name") || "",
      id: element.id,
      required: element.required,
      disabled: element.disabled,

      options:
        element instanceof HTMLSelectElement
          ? getSelectOptions(element)
          : undefined
    };
  });

  // Group related radio buttons and checkboxes.
  const groups = new Map<string, HTMLInputElement[]>();

  choiceFields.forEach((element, index) => {
    const formIndex = Array.from(document.forms).indexOf(
      element.form as HTMLFormElement
    );

    const groupKey = element.name
      ? `${formIndex}:${element.type}:${element.name}`
      : `${formIndex}:${element.type}:single-${index}`;

    const group = groups.get(groupKey) || [];
    group.push(element);
    groups.set(groupKey, group);
  });

  groups.forEach((group, index) => {
    const first = group[0];
    const fieldset = first.closest("fieldset");
    const legend = fieldset?.querySelector("legend")?.textContent?.trim();

    const groupLabel =
      legend ||
      fieldset?.getAttribute("aria-label") ||
      fieldset?.getAttribute("aria-labelledby")
        ?.split(/\s+/)
        .map(id => document.getElementById(id)?.textContent?.trim())
        .filter(Boolean)
        .join(" ") ||
      "";

    const options: FormOption[] = group.map(element => ({
      label: getLabel(element),
      value: element.value,
      disabled: element.disabled
    }));

    const type = first.type;

    results.push({
      fieldId: first.name
        ? `group-${type}-${first.name}`
        : `group-${type}-${index}`,

      kind: "choice-group",
      tagName: "input",
      type,
      label: groupLabel || options[0]?.label || type,
      placeholder: "",
      name: first.name,
      id: first.id,
      required: group.some(element => element.required),
      disabled: group.every(element => element.disabled),
      options
    });
  });

  return results;
}
