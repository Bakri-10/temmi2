export class EmailValidationError extends Error {
    constructor(message: any);
}
export class TemplateValidationError extends Error {
    constructor(message: any);
    stack: string;
}
