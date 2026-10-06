from pydantic import BaseModel, EmailStr
from typing import Optional, Any

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Optional[dict] = None

class LoginRequest(BaseModel):
    identifier: str
    password: str
    roleType: Optional[str] = "admin"  # admin, teacher, student

class RegisterAdminRequest(BaseModel):
    institute_name: Optional[str] = None
    instituteName: Optional[str] = None
    admin_name: Optional[str] = None
    adminName: Optional[str] = None
    fullName: Optional[str] = None
    email: Optional[str] = None
    adminEmail: Optional[str] = None
    instituteEmail: Optional[str] = None
    password: str
    phone: Optional[str] = None
    contactNumber: Optional[str] = None
    address: Optional[str] = None
    instituteAddress: Optional[str] = None
    code: Optional[str] = None

    def get_institute_name(self) -> str:
        name = self.institute_name or self.instituteName
        if not name:
            raise ValueError("Institute name is required")
        return name

    def get_admin_name(self) -> str:
        return self.admin_name or self.fullName or self.adminName or "Administrator"

    def get_email(self) -> str:
        mail = self.email or self.adminEmail or self.instituteEmail
        if not mail:
            raise ValueError("Email is required")
        return mail.lower()

    def get_phone(self) -> Optional[str]:
        return self.phone or self.contactNumber

    def get_address(self) -> Optional[str]:
        return self.address or self.instituteAddress

class UserProfileResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    role: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    status: str
    institute_id: Optional[str] = None
    branch_id: Optional[str] = None
