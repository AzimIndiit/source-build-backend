import { Document, Types } from 'mongoose'

export enum QuoteStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

export enum ProjectType {
  NEW_CONSTRUCTION = 'new-construction',
  REMODEL = 'remodel',
  MULTI_UNIT = 'multi-unit',
  COMMERCIAL = 'commercial'
}

export enum InstallationLocation {
  KITCHEN = 'kitchen',
  BATHROOM = 'bathroom',
  LAUNDRY = 'laundry',
  OFFICE = 'office',
  GARAGE = 'garage',
  BASEMENT = 'basement'
}

export enum ExistingDesign {
  BLUEPRINTS = 'blueprints',
  SKETCHES = 'sketches',
  PHOTOS = 'photos',
  NONE = 'none'
}

export enum CabinetStyle {
  SHAKER = 'shaker',
  FLAT_PANEL = 'flat-panel',
  RAISED_PANEL = 'raised-panel',
  MODERN = 'modern',
  TRADITIONAL = 'traditional',
  TRANSITIONAL = 'transitional'
}

export enum Material {
  MDF = 'mdf',
  PLYWOOD = 'plywood',
  SOLID_WOOD = 'solid-wood',
  THERMOFOIL = 'thermofoil',
  LAMINATE = 'laminate',
  MELAMINE = 'melamine'
}

export enum FinishColor {
  PAINTED = 'painted',
  STAINED = 'stained',
  NATURAL_WOOD = 'natural-wood',
  WHITE = 'white',
  GRAY = 'gray',
  BLACK = 'black',
  NAVY = 'navy',
  CUSTOM_COLOR = 'custom-color'
}

export interface IQuote {
  user: Types.ObjectId
  status: QuoteStatus
  
  // Project Details
  projectType: ProjectType
  installationLocation: InstallationLocation
  spaceWidth: number
  spaceHeight: number
  existingDesign: ExistingDesign
  
  // Cabinet Details
  cabinetStyle: CabinetStyle
  material: Material
  finishColor: FinishColor
  
  // Additional Information
  additionalComments?: string
  images?: string[]
  
  // Quote Response (filled by admin/seller)
  quotedPrice?: number
  estimatedTime?: string
  responseNotes?: string
  respondedBy?: Types.ObjectId
  respondedAt?: Date
  
  // Timestamps
  createdAt?: Date
  updatedAt?: Date
}

export interface IQuoteDocument extends IQuote, Document {
  _id: Types.ObjectId
}

// DTOs
export interface CreateQuoteDTO {
  projectType: string
  installationLocation: string
  spaceWidth: string
  spaceHeight: string
  existingDesign: string
  cabinetStyle: string
  material: string
  finishColor: string
  additionalComments?: string
}

export interface UpdateQuoteDTO {
  status?: QuoteStatus
  quotedPrice?: number
  estimatedTime?: string
  responseNotes?: string
}

export interface QuoteResponseDTO {
  id: string
  user: {
    id: string
    name: string
    email: string
    phone?: string
  }
  status: QuoteStatus
  projectType: ProjectType
  installationLocation: InstallationLocation
  dimensions: {
    width: number
    height: number
  }
  existingDesign: ExistingDesign
  cabinetStyle: CabinetStyle
  material: Material
  finishColor: FinishColor
  additionalComments?: string
  images?: string[]
  quotedPrice?: number
  estimatedTime?: string
  responseNotes?: string
  respondedBy?: {
    id: string
    name: string
  }
  respondedAt?: Date
  createdAt: Date
  updatedAt: Date
}