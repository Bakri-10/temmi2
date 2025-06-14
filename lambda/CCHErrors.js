export class EmailValidationError extends Error {
    constructor(message) {
      super(message);
      this.name = "EmailValidationError";
    }
}

export class TemplateValidationError extends Error {
  constructor(message) {
    super(message);
    const re = /[\\"]+/g;
    this.name = "TemplateValidationError";
    this.stack = "";
    this.message = `Path ${message.replace(re," ")}`;
  }
}