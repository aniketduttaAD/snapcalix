export interface FormErrors {
    [key: string]: string;
}

export interface ValidationRules {
    [key: string]: {
        required?: boolean;
        minValue?: number;
        maxValue?: number;
        minLength?: number;
        maxLength?: number;
        pattern?: RegExp;
        custom?: (value: any) => boolean;
        message?: string;
    };
}

export const validateForm = (values: any, rules: ValidationRules): FormErrors => {
    const errors: FormErrors = {};

    Object.keys(rules).forEach(field => {
        const value = values[field];
        const fieldRules = rules[field];

        if (fieldRules.required && (value === undefined || value === null || value === '')) {
            errors[field] = fieldRules.message || `${field} is required`;
            return;
        }

        if (value === undefined || value === null || value === '') {
            return;
        }

        if (typeof value === 'number' || !isNaN(Number(value))) {
            const numValue = typeof value === 'number' ? value : Number(value);

            if (fieldRules.minValue !== undefined && numValue < fieldRules.minValue) {
                errors[field] = fieldRules.message || `${field} must be at least ${fieldRules.minValue}`;
            }

            if (fieldRules.maxValue !== undefined && numValue > fieldRules.maxValue) {
                errors[field] = fieldRules.message || `${field} must be at most ${fieldRules.maxValue}`;
            }
        }

        if (typeof value === 'string') {
            if (fieldRules.minLength !== undefined && value.length < fieldRules.minLength) {
                errors[field] = fieldRules.message || `${field} must be at least ${fieldRules.minLength} characters`;
            }

            if (fieldRules.maxLength !== undefined && value.length > fieldRules.maxLength) {
                errors[field] = fieldRules.message || `${field} must be at most ${fieldRules.maxLength} characters`;
            }

            if (fieldRules.pattern !== undefined && !fieldRules.pattern.test(value)) {
                errors[field] = fieldRules.message || `${field} is invalid`;
            }
        }

        if (fieldRules.custom !== undefined && !fieldRules.custom(value)) {
            errors[field] = fieldRules.message || `${field} is invalid`;
        }
    });

    return errors;
};