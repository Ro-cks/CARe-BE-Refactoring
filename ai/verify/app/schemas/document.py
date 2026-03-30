from pydantic import BaseModel


class PassportOCRResponse(BaseModel):
    passport_no: str = ""
    surname: str = ""
    given_names: str = ""
    nationality: str = ""
    date_of_birth: str = ""
    sex: str = ""
    place_of_birth: str = ""
    date_of_issue: str = ""
    date_of_expiry: str = ""
    mrz: str = ""


class LicenseOCRResponse(BaseModel):
    license_number: str = ""
    name: str = ""
    date_of_birth: str = ""
    address: str = ""
    date_of_expiry: str = ""
    date_of_issue: str = ""
    sex: str = ""
