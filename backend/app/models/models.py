# This file defines the database models for our application.
# Each class here represents one table in our Supabase PostgreSQL database.
from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, DateTime, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from ..database import Base


# Used to track the roles of users.
class UserRole(str, enum.Enum):
    ADMIN = "Admin"
    INVENTORY_MANAGER = "InventoryManager"
    SET_BUILDER = "SetBuilder"
    SET_DESIGNER = "SetDesigner"
    CREW = "Crew"

# Used to track the physical state of inventory items.
class ItemCondition(str, enum.Enum):
    NEW = "New"
    GOOD = "Good"
    FAIR = "Fair"
    POOR = "Poor"
    DAMAGED = "Damaged"

# USER TABLE
# Stores everyone who has an account in the system. Role column controls what each person is allowed to do.
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    role = Column(Enum(UserRole, values_callable=lambda x: [e.value for e in x]), default=UserRole.CREW, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    tutorials = relationship("Tutorial", back_populates="creator")
    transactions = relationship("InventoryTransaction", back_populates="user")
    productions = relationship("Production", back_populates="created_by")
    item_photos = relationship("ItemPhoto", back_populates="uploader")

# CATEGORY TABLE
# Groups items by material type (e.g. "Wood")
class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    material_type = Column(String)
    items = relationship("Item", back_populates="category")

# LOCATION TABLE
# Tracks where in the physical storage room/building an item can be found.
class Location(Base):
    __tablename__ = "locations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    items = relationship("Item", back_populates="location")

# ITEM TABLE
# Represents a single type of physical item
class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(Text)
    total_quantity = Column(Integer, nullable=False, default=0)
    available_quantity = Column(Integer, nullable=False, default=0)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    in_use = Column(Boolean, default=False)
    unit = Column(String)
    image_url = Column(String)
    reorder_threshold = Column(Integer, default=0)
    weight_per_unit = Column(Float)
    # Optional physical details added for more descriptive inventory records
    height_cm = Column(Float)
    width_cm = Column(Float)
    depth_cm = Column(Float)
    colour = Column(String)
    condition = Column(Enum(ItemCondition, values_callable=lambda x: [e.value for e in x]), default=ItemCondition.GOOD, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    category = relationship("Category", back_populates="items")
    location = relationship("Location", back_populates="items")
    tutorial_materials = relationship("TutorialMaterial", back_populates="item")
    transactions = relationship("InventoryTransaction", back_populates="item")
    production_items = relationship("ProductionItem", back_populates="item")
    photos = relationship("ItemPhoto", back_populates="item", cascade="all, delete-orphan")

# ITEM PHOTO TABLE
# Stores uploaded image metadata for inventory items.
# The actual image is stored in Supabase Storage; this table stores the public URL/path.
class ItemPhoto(Base):
    __tablename__ = "item_photos"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    url = Column(Text, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    item = relationship("Item", back_populates="photos")
    uploader = relationship("User", back_populates="item_photos")

# TUTORIAL TABLE
# Represents one complete stage construction guide. Contains metadata, the actual steps are in TutorialStep below.
class Tutorial(Base):
    __tablename__ = "tutorials"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    creator = relationship("User", back_populates="tutorials")
    steps = relationship("TutorialStep", back_populates="tutorial", cascade="all, delete-orphan")
    materials = relationship("TutorialMaterial", back_populates="tutorial", cascade="all, delete-orphan")

# TUTORIAL STEP TABLE
# Each row is one step in a tutorial guide.
class TutorialStep(Base):
    __tablename__ = "tutorial_steps"
    id = Column(Integer, primary_key=True, index=True)
    tutorial_id = Column(Integer, ForeignKey("tutorials.id"), nullable=False)
    step_number = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    tutorial = relationship("Tutorial", back_populates="steps")

# TUTORIAL MATERIAL TABLE  (Many-to-Many join table)
# Stores which inventory items are needed for a given tutorial, and how many.
class TutorialMaterial(Base):
    __tablename__ = "tutorial_materials"
    id = Column(Integer, primary_key=True, index=True)
    tutorial_id = Column(Integer, ForeignKey("tutorials.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    quantity_required = Column(Float, nullable=False)
    tutorial = relationship("Tutorial", back_populates="materials")
    item = relationship("Item", back_populates="tutorial_materials")

# INVENTORY TRANSACTION TABLE
# An audit log of every change made to item quantities.
class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    notes = Column(Text)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    item = relationship("Item", back_populates="transactions")
    user = relationship("User", back_populates="transactions")


# Used to track production status.
class ProductionStatus(str, enum.Enum):
    ACTIVE = "Active"
    ENDED = "Ended"

# PRODUCTION TABLE
# Represents a theatre production (e.g. Macbeth).
# When status is set to Ended, all assigned items are returned to general stock.
# The production record and its item history are never deleted.
class Production(Base):
    __tablename__ = "productions"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    status = Column(
        Enum(ProductionStatus, values_callable=lambda x: [e.value for e in x]),
        default=ProductionStatus.ACTIVE,
        nullable=False
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_by = relationship("User", back_populates="productions")
    production_items = relationship("ProductionItem", back_populates="production", cascade="all, delete-orphan")


# PRODUCTION ITEM TABLE  (Many-to-Many join table)
# Tracks which items are assigned to a production and how many.
# returned=False means still in use by the production.
# returned=True means back in general stock i.e. row is kept for history.
class ProductionItem(Base):
    __tablename__ = "production_items"
    id = Column(Integer, primary_key=True, index=True)
    production_id = Column(Integer, ForeignKey("productions.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    quantity_assigned = Column(Integer, nullable=False)
    returned = Column(Boolean, default=False, nullable=False)
    returned_at = Column(DateTime(timezone=True), nullable=True)
    production = relationship("Production", back_populates="production_items")
    item = relationship("Item", back_populates="production_items")