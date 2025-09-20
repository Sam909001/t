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
                const customValidator = this.customValidators.get(params.validator);
                if (customValidator && !customValidator.validator(value, field, params)) {
                    return message || customValidator.message;
                }
                break;
        }

        return null;
    }

    // Update field UI based on validation result
    updateFieldUI(field, errors) {
        const errorContainer = this.getOrCreateErrorContainer(field);
        
        // Clear previous errors
        field.classList.remove('error', 'invalid', 'valid');
        errorContainer.style.display = 'none';
        errorContainer.textContent = '';

        if (errors.length > 0) {
            // Show errors
            field.classList.add('error', 'invalid');
            errorContainer.textContent = errors[0]; // Show first error
            errorContainer.style.display = 'block';
        } else if (field.value.trim() !== '') {
            // Field is valid and has content
            field.classList.add('valid');
        }
    }

    // Get or create error container for field
    getOrCreateErrorContainer(field) {
        const errorId = field.id + 'Error';
        let errorContainer = document.getElementById(errorId);

        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = errorId;
            errorContainer.className = 'error-message';
            errorContainer.style.cssText = `
                color: var(--accent, #e74c3c);
                font-size: 0.8rem;
                margin-top: 0.2rem;
                display: none;
            `;

            // Insert after the field
            field.parentNode.insertBefore(errorContainer, field.nextSibling);
        }

        return errorContainer;
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

    // Turkish ID number validation
    isValidTurkishId(id) {
        if (!id || id.length !== 11) return false;
        
        const digits = id.split('').map(Number);
        if (digits.some(isNaN)) return false;
        if (digits[0] === 0) return false;

        const sum1 = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
        const sum2 = digits[1] + digits[3] + digits[5] + digits[7];
        const check1 = (sum1 * 7 - sum2) % 10;
        const check2 = (sum1 + sum2 + check1) % 10;

        return check1 === digits[9] && check2 === digits[10];
    }

    // Setup real-time validation for a field
    setupRealTimeValidation(fieldId, rules, debounceTime = 300) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        this.addRule(fieldId, rules);

        const debouncedValidate = Helpers.debounce(() => {
            this.validateField(fieldId);
        }, debounceTime);

        field.addEventListener('input', debouncedValidate);
        field.addEventListener('blur', () => {
            this.validateField(fieldId);
        });
    }

    // Setup form validation
    setupFormValidation(formId, fieldRules, onSubmit) {
        const form = document.getElementById(formId);
        if (!form) return;

        // Add rules for all fields
        Object.entries(fieldRules).forEach(([fieldId, rules]) => {
            this.setupRealTimeValidation(fieldId, rules);
        });

        // Handle form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const result = this.validateForm(form);
            if (result.isValid) {
                if (onSubmit) onSubmit(new FormData(form));
            } else {
                // Focus first invalid field
                const firstInvalidField = Object.keys(result.fields).find(
                    fieldId => !result.fields[fieldId].isValid
                );
                if (firstInvalidField) {
                    document.getElementById(firstInvalidField)?.focus();
                }
            }
        });
    }

    // Clear all validation for a form
    clearFormValidation(formElement) {
        const inputs = formElement.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.classList.remove('error', 'invalid', 'valid');
            const errorContainer = document.getElementById(input.id + 'Error');
            if (errorContainer) {
                errorContainer.style.display = 'none';
            }
        });
    }

    // Validate common form patterns
    validateLoginForm(emailId, passwordId) {
        return this.validateFields([emailId, passwordId]);
    }

    validateRegistrationForm(emailId, passwordId, confirmPasswordId) {
        this.addRule(confirmPasswordId, [
            { type: 'required' },
            { type: 'match', field: passwordId, message: 'Şifreler eşleşmiyor' }
        ]);
        
        return this.validateFields([emailId, passwordId, confirmPasswordId]);
    }

    // Preset validation rules
    static getCommonRules() {
        return {
            email: [
                { type: 'required' },
                { type: 'email' }
            ],
            password: [
                { type: 'required' },
                { type: 'minLength', min: 6, message: 'Şifre en az 6 karakter olmalıdır' }
            ],
            phone: [
                { type: 'required' },
                { type: 'phone' }
            ],
            name: [
                { type: 'required' },
                { type: 'minLength', min: 2, message: 'Ad en az 2 karakter olmalıdır' }
            ],
            number: [
                { type: 'required' },
                { type: 'number' },
                { type: 'min', min: 0 }
            ]
        };
    }
}

// Create global instance
window.ValidationManager = new ValidationManager();
