// Form validation utilities
class ValidationManager {
    constructor() {
        this.rules = new Map();
        this.customValidators = new Map();
        this.errorMessages = {
            required: 'Bu alan zorunludur',
            email: 'Geçerli bir e-posta adresi girin',
            phone: 'Geçerli bir telefon numarası girin',
            number: 'Geçerli bir sayı girin',
            minLength: 'En az {min} karakter olmalıdır',
            maxLength: 'En fazla {max} karakter olabilir',
            min: 'En az {min} olmalıdır',
            max: 'En fazla {max} olabilir',
            pattern: 'Geçerli format değil',
            match: 'Alanlar eşleşmiyor'
        };
    }

    // Add validation rule for a field
    addRule(fieldId, rules) {
        this.rules.set(fieldId, rules);
    }

    // Add custom validator
    addCustomValidator(name, validator, message) {
        this.customValidators.set(name, { validator, message });
    }

    // Validate a single field
    validateField(fieldId, value = null) {
        const field = document.getElementById(fieldId);
        if (!field) {
            console.warn(`Field ${fieldId} not found`);
            return { isValid: true, errors: [] };
        }

        const fieldValue = value !== null ? value : field.value;
        const rules = this.rules.get(fieldId) || [];
        const errors = [];

        for (const rule of rules) {
            const error = this.checkRule(fieldValue, rule, field);
            if (error) {
                errors.push(error);
            }
        }

        // Update field UI
        this.updateFieldUI(field, errors);

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Validate multiple fields
    validateFields(fieldIds) {
        const results = {};
        let allValid = true;

        for (const fieldId of fieldIds) {
            const result = this.validateField(fieldId);
            results[fieldId] = result;
            if (!result.isValid) {
                allValid = false;
            }
        }

        return {
            isValid: allValid,
            fields: results
        };
    }

    // Validate entire form
    validateForm(formElement) {
        const inputs = formElement.querySelectorAll('input, select, textarea');
        const fieldIds = Array.from(inputs).map(input => input.id).filter(id => id);
        return this.validateFields(fieldIds);
    }

    // Check individual rule
    checkRule(value, rule, field) {
        const { type, message, ...params } = rule;

        switch (type) {
            case 'required':
                if (!value || value.trim() === '') {
                    return message || this.errorMessages.required;
                }
                break;

            case 'email':
                if (value && !this.isValidEmail(value)) {
                    return message || this.errorMessages.email;
                }
                break;

            case 'phone':
                if (value && !this.isValidPhone(value)) {
                    return message || this.errorMessages.phone;
                }
                break;

            case 'number':
                if (value && isNaN(Number(value))) {
                    return message || this.errorMessages.number;
                }
                break;

            case 'minLength':
                if (value && value.length < params.min) {
                    return message || this.errorMessages.minLength.replace('{min}', params.min);
                }
                break;

            case 'maxLength':
                if (value && value.length > params.max) {
                    return message || this.errorMessages.maxLength.replace('{max}', params.max);
                }
                break;

            case 'min':
                if (value && Number(value) < params.min) {
                    return message || this.errorMessages.min.replace('{min}', params.min);
                }
                break;

            case 'max':
                if (value && Number(value) > params.max) {
                    return message || this.errorMessages.max.replace('{max}', params.max);
                }
                break;

            case 'pattern':
                if (value && !params.regex.test(value)) {
                    return message || this.errorMessages.pattern;
                }
                break;

            case 'match':
                const matchField = document.getElementById(params.field);
                if (matchField && value !== matchField.value) {
                    return message || this.errorMessages.match;
                }
                break;

            case 'custom':
                const customValidator = this.customValidators.get(params.name);
                if (customValidator && !customValidator.validator(value, field)) {
                    return message || customValidator.message;
                }
                break;
        }

        return null;
    }

    // Update field UI based on validation
    updateFieldUI(field, errors) {
        const hasErrors = errors.length > 0;
        
        // Update field styling
        field.classList.toggle('error', hasErrors);
        field.classList.toggle('invalid', hasErrors);
        field.classList.toggle('valid', !hasErrors && field.value.trim() !== '');

        // Update error message
        const errorId = field.id + 'Error';
        let errorElement = document.getElementById(errorId);
        
        if (hasErrors) {
            if (!errorElement) {
                errorElement = document.createElement('div');
                errorElement.id = errorId;
                errorElement.className = 'error-message';
                field.parentNode.appendChild(errorElement);
            }
            errorElement.textContent = errors[0]; // Show first error
            errorElement.style.display = 'block';
        } else if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    // Email validation
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Phone validation
    isValidPhone(phone) {
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
        return phoneRegex.test(phone);
    }

    // Setup real-time validation
    setupRealtimeValidation(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        const validateOnEvent = Helpers.debounce(() => {
            this.validateField(fieldId);
        }, 300);

        field.addEventListener('input', validateOnEvent);
        field.addEventListener('blur', () => this.validateField(fieldId));
    }

    // Clear validation errors
    clearValidation(fieldId) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.remove('error', 'invalid', 'valid');
            const errorElement = document.getElementById(fieldId + 'Error');
            if (errorElement) {
                errorElement.style.display = 'none';
            }
        }
    }

    // Clear all validation errors in form
    clearFormValidation(formElement) {
        const inputs = formElement.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.id) {
                this.clearValidation(input.id);
            }
        });
    }
}

// Create global instance
window.ValidationManager = new ValidationManager();

// Common validation rule sets
window.ValidationRules = {
    email: [
        { type: 'required' },
        { type: 'email' }
    ],
    password: [
        { type: 'required' },
        { type: 'minLength', min: 6 }
    ],
    phone: [
        { type: 'phone' }
    ],
    required: [
        { type: 'required' }
    ],
    number: [
        { type: 'number' }
    ],
    positiveNumber: [
        { type: 'number' },
        { type: 'min', min: 0 }
    ]
};
