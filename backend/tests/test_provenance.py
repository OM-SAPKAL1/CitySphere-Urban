import pytest
from app.provenance.registry import provenance_registry, KNOWN_LICENSES

def test_provenance_registry_contains_eight_datasets():
    items = provenance_registry.list_all()
    assert len(items) >= 8

def test_provenance_license_validation():
    val_odbl = provenance_registry.validate_license("ODbL-1.0")
    assert val_odbl["valid"] is True
    assert val_odbl["details"]["attribution_required"] is True

    val_unknown = provenance_registry.validate_license("MADE_UP_LICENSE")
    assert val_unknown["valid"] is False

def test_provenance_classification_types():
    items = provenance_registry.list_all()
    valid_types = {"observed", "derived", "estimated", "synthetic"}
    for item in items:
        assert item.classification in valid_types
        assert item.license in KNOWN_LICENSES
        assert item.retrieval_date is not None
        assert len(item.units) > 0
