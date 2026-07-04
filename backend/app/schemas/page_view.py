from sqlmodel import Field, SQLModel


class PageViewCreate(SQLModel):
    path: str = Field(min_length=1, max_length=500)
    referrer: str | None = Field(default=None, max_length=500)


class PageViewStats(SQLModel):
    path: str
    count: int
