"""add_auth_best_practice_fields

Revision ID: 5df68122fd05
Revises: 9e722716fb7c
Create Date: 2026-04-25 17:00:02.109341

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '5df68122fd05'
down_revision: Union[str, Sequence[str], None] = '9e722716fb7c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Auth Best Practice alanları ekleniyor."""
    op.add_column('user', sa.Column('email_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('user', sa.Column('username_changed_at', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('user', sa.Column('auth_provider', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default=sa.text("'email'")))


def downgrade() -> None:
    """Auth Best Practice alanları kaldırılıyor."""
    op.drop_column('user', 'auth_provider')
    op.drop_column('user', 'username_changed_at')
    op.drop_column('user', 'email_verified')

