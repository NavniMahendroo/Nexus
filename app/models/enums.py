from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    VOLUNTEER = "volunteer"
    NGO = "ngo"

class TaskStatus(str, Enum):
    OPEN = "open"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class NeedSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class NeedStatus(str, Enum):
    RAW = "raw"
    MERGED = "merged"
    CONVERTED_TO_TASK = "converted_to_task"
    CLOSED = "closed"

class AssignmentStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"

