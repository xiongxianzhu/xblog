from sqlmodel import Field, SQLModel


class FriendLinkPublic(SQLModel):
    id: int
    name: str
    url: str
    logo_url: str | None
    sort_order: int


class FriendLinkCreate(SQLModel):
    name: str = Field(min_length=1, max_length=100)
    url: str = Field(min_length=1, max_length=500)
    logo_url: str | None = Field(default=None, max_length=500)
    sort_order: int = 0


class FriendLinkUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    url: str | None = Field(default=None, min_length=1, max_length=500)
    logo_url: str | None = Field(default=None, max_length=500)
    sort_order: int | None = None
