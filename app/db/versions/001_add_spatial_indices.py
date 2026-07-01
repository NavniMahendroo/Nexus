"""add spatial indices

Revision ID: 001_add_spatial_indices
Revises: None
Create Date: 2026-07-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '001_add_spatial_indices'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Explicitly create GiST spatial indexes if they do not exist.
    # Why this index matters for query performance at scale:
    # GiST (Generalized Search Tree) indexes are crucial for geographical data in PostGIS.
    # Standard B-tree indexes only index one-dimensional data. Geospatial data is multi-dimensional
    # (latitude and longitude). A GiST index partitions 2D space hierarchically into bounding boxes,
    # enabling high-performance spatial queries like ST_DWithin (to find points within a search radius)
    # in O(log N) average time complexity instead of O(N) linear full-table scans.
    op.execute("CREATE INDEX IF NOT EXISTS idx_volunteers_location ON volunteers USING gist(location);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_tasks_location ON tasks USING gist(location);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_need_reports_location ON need_reports USING gist(location);")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_volunteers_location;")
    op.execute("DROP INDEX IF EXISTS idx_tasks_location;")
    op.execute("DROP INDEX IF EXISTS idx_need_reports_location;")
