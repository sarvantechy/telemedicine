import pytest
from pydantic import ValidationError

from app.schemas import PrescriptionCreate


def test_prescription_requires_at_least_one_medicine() -> None:
    with pytest.raises(ValidationError):
        PrescriptionCreate(appointment_id="appointment-1", medicines=[])


def test_prescription_rejects_blank_medicine_fields() -> None:
    with pytest.raises(ValidationError):
        PrescriptionCreate(
            appointment_id="appointment-1",
            medicines=[
                {
                    "name": "   ",
                    "dose": "500 mg",
                    "frequency": "twice daily",
                    "duration": "5 days",
                }
            ],
        )


def test_prescription_normalizes_required_medicine_fields() -> None:
    prescription = PrescriptionCreate(
        appointment_id="appointment-1",
        medicines=[
            {
                "name": " Paracetamol ",
                "dose": " 500 mg ",
                "frequency": " twice daily ",
                "duration": " 5 days ",
            }
        ],
    )

    medicine = prescription.medicines[0]
    assert medicine.name == "Paracetamol"
    assert medicine.dose == "500 mg"
    assert medicine.frequency == "twice daily"
    assert medicine.duration == "5 days"