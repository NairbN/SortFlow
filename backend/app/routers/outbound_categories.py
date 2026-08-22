from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.outbound_category import OutboundCategory
from app.schemas.outbound_category import (
    OutboundCategoryCreate,
    OutboundCategoryRead,
    OutboundCategoryUpdate,
)

router = APIRouter(prefix="/outbound-categories", tags=["outbound-categories"])


@router.get("", response_model=list[OutboundCategoryRead])
def list_categories(db: Session = Depends(get_db)):
    return db.scalars(select(OutboundCategory).order_by(OutboundCategory.category_name)).all()


@router.post("", response_model=OutboundCategoryRead, status_code=201)
def create_category(payload: OutboundCategoryCreate, db: Session = Depends(get_db)):
    category = OutboundCategory(**payload.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.patch("/{category_id}", response_model=OutboundCategoryRead)
def update_category(category_id: int, payload: OutboundCategoryUpdate, db: Session = Depends(get_db)):
    category = db.get(OutboundCategory, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(category, field, value)

    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=204)
def delete_category(category_id: int, db: Session = Depends(get_db)):
    category = db.get(OutboundCategory, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(category)
    db.commit()
