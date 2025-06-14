"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateValidationError = exports.EmailValidationError = void 0;
class EmailValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "EmailValidationError";
    }
}
exports.EmailValidationError = EmailValidationError;
class TemplateValidationError extends Error {
    constructor(message) {
        super(message);
        const re = /[\\"]+/g;
        this.name = "TemplateValidationError";
        this.stack = "";
        this.message = `Path ${message.replace(re, " ")}`;
    }
}
exports.TemplateValidationError = TemplateValidationError;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ0NIRXJyb3JzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vbGFtYmRhL0NDSEVycm9ycy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxNQUFhLG9CQUFxQixTQUFRLEtBQUs7SUFDM0MsWUFBWSxPQUFPO1FBQ2pCLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNmLElBQUksQ0FBQyxJQUFJLEdBQUcsc0JBQXNCLENBQUM7SUFDckMsQ0FBQztDQUNKO0FBTEQsb0RBS0M7QUFFRCxNQUFhLHVCQUF3QixTQUFRLEtBQUs7SUFDaEQsWUFBWSxPQUFPO1FBQ2pCLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNmLE1BQU0sRUFBRSxHQUFHLFNBQVMsQ0FBQztRQUNyQixJQUFJLENBQUMsSUFBSSxHQUFHLHlCQUF5QixDQUFDO1FBQ3RDLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ2hCLElBQUksQ0FBQyxPQUFPLEdBQUcsUUFBUSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBQyxHQUFHLENBQUMsRUFBRSxDQUFDO0lBQ25ELENBQUM7Q0FDRjtBQVJELDBEQVFDIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGNsYXNzIEVtYWlsVmFsaWRhdGlvbkVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICAgIGNvbnN0cnVjdG9yKG1lc3NhZ2UpIHtcbiAgICAgIHN1cGVyKG1lc3NhZ2UpO1xuICAgICAgdGhpcy5uYW1lID0gXCJFbWFpbFZhbGlkYXRpb25FcnJvclwiO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFRlbXBsYXRlVmFsaWRhdGlvbkVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihtZXNzYWdlKSB7XG4gICAgc3VwZXIobWVzc2FnZSk7XG4gICAgY29uc3QgcmUgPSAvW1xcXFxcIl0rL2c7XG4gICAgdGhpcy5uYW1lID0gXCJUZW1wbGF0ZVZhbGlkYXRpb25FcnJvclwiO1xuICAgIHRoaXMuc3RhY2sgPSBcIlwiO1xuICAgIHRoaXMubWVzc2FnZSA9IGBQYXRoICR7bWVzc2FnZS5yZXBsYWNlKHJlLFwiIFwiKX1gO1xuICB9XG59Il19