from __future__ import annotations

import argparse

from auth import hash_password
from database import SessionLocal
from repositories.users import UserRepository
from models.user import UserRole


def main():
    parser = argparse.ArgumentParser(description="Create or promote a user role")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", default="Admin123!")
    parser.add_argument("--name", default="Platform Admin")
    parser.add_argument("--role", choices=sorted(UserRole.ALL), default=UserRole.ADMIN)
    args = parser.parse_args()

    db = SessionLocal()
    try:
        users = UserRepository(db)
        user = users.get_by_email(args.email)
        if user:
            users.update_role(user, args.role)
            print(f"Updated {args.email} -> {args.role}")
            return
        created = users.create(
            email=args.email,
            name=args.name,
            hashed_password=hash_password(args.password),
            role=args.role,
        )
        print(f"Created {created.email} with role {created.role}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
