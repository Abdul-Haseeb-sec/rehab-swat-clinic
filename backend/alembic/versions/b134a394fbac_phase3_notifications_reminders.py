"""phase3_notifications_reminders

Revision ID: b134a394fbac
Revises: 4589973d8b1f
Create Date: 2026-05-21 16:44:14.599101

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import models


# revision identifiers, used by Alembic.
revision: str = 'b134a394fbac'
down_revision: Union[str, Sequence[str], None] = '4589973d8b1f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create notifications table
    op.create_table('notifications',
    sa.Column('id', models.PortableUUID(length=36), nullable=False),
    sa.Column('user_id', models.PortableUUID(length=36), nullable=False),
    sa.Column('type', sa.Enum('EMR_REVIEW', 'LOW_STOCK', 'OVERDUE_INVOICE', 'APPOINTMENT_CANCELLED', 'RECALL', 'GENERAL', name='notificationtype'), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.text('0')),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notifications_id'), 'notifications', ['id'], unique=False)
    op.create_index(op.f('ix_notifications_user_id'), 'notifications', ['user_id'], unique=False)

    # Add same_day_reminder_sent column to appointments table
    op.add_column('appointments', sa.Column('same_day_reminder_sent', sa.Boolean(), nullable=False, server_default=sa.text('0')))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('appointments', 'same_day_reminder_sent')
    op.drop_index(op.f('ix_notifications_user_id'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_id'), table_name='notifications')
    op.drop_table('notifications')
