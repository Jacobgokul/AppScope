"""Add user notification preferences

Revision ID: 008
Revises: 007
Create Date: 2026-02-08 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add notification_preferences column to users table with default values
    op.add_column(
        'users',
        sa.Column(
            'notification_preferences',
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{\"email_critical_alerts\": true, \"email_daily_summary\": true, \"email_weekly_reports\": false, \"email_ai_analysis\": true}'::jsonb")
        )
    )


def downgrade() -> None:
    # Remove notification_preferences column
    op.drop_column('users', 'notification_preferences')
