"""add embedding column and duplicate candidates table

Revision ID: 002_add_embedding_column
Revises: 001_add_spatial_indices
Create Date: 2026-07-01 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002_add_embedding_column'
down_revision: Union[str, None] = '001_add_spatial_indices'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Get database inspector to verify existing tables and columns
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # 1. Conditionally add embedding column if it doesn't already exist
    columns = [c['name'] for c in inspector.get_columns('need_reports')]
    if 'embedding' not in columns:
        op.add_column('need_reports', sa.Column('embedding', sa.JSON(), nullable=True))

    # 2. Conditionally create duplicate_candidates table if it doesn't already exist
    tables = inspector.get_table_names()
    if 'duplicate_candidates' not in tables:
        op.create_table(
            'duplicate_candidates',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('report_id', sa.Integer(), nullable=False),
            sa.Column('duplicate_report_id', sa.Integer(), nullable=False),
            sa.Column('similarity_score', sa.Float(), nullable=False),
            sa.Column('status', sa.String(), nullable=False, server_default='pending'),
            sa.ForeignKeyConstraint(['duplicate_report_id'], ['need_reports.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['report_id'], ['need_reports.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_duplicate_candidates_id'), 'duplicate_candidates', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_duplicate_candidates_id'), table_name='duplicate_candidates')
    op.drop_table('duplicate_candidates')
    op.drop_column('need_reports', 'embedding')
