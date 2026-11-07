from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class BaseSourceAdapter(ABC):
    """
    Abstract base adapter for all CitySphere data source ingestors.
    Enforces provenance tracking, schema validation, and normalization.
    """
    def __init__(self, dataset_id: str):
        self.dataset_id = dataset_id

    @abstractmethod
    def fetch(self, **kwargs) -> Any:
        """Fetch raw data from upstream API, file reference, or cached source."""
        pass

    @abstractmethod
    def validate(self, raw_data: Any) -> bool:
        """Validate raw data schema, coordinates, timestamps, and missing fields."""
        pass

    @abstractmethod
    def normalize(self, raw_data: Any) -> Any:
        """Transform raw data into canonical normalized schema."""
        pass

    def get_provenance_id(self) -> str:
        return self.dataset_id
