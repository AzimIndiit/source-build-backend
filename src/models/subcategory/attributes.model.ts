import { Schema, model } from 'mongoose'

export interface IAttribute {
  name: string
  inputType: 'text' | 'number' | 'dropdown' | 'multiselect' | 'boolean' | 'radio'
  required?: boolean
  values?: { value: string; order?: number }[] // optional allowed values for dropdown/multiselect/radio
  order?: number
  isActive?: boolean
}

const attributeSchema = new Schema<IAttribute>(
  {
    name: {
      type: String,
      required: [true, 'Attribute name is required'],
      trim: true,
      maxlength: [100, 'Attribute name cannot exceed 100 characters'],
    },
  
    inputType: {
      type: String,
      enum: ['text', 'number', 'dropdown', 'multiselect', 'boolean', 'radio'],
      required: [true, 'Input type is required'],
    },
    required: {
      type: Boolean,
      default: false,
    },
    values: [
      {
        value: { type: String, trim: true, required: true },
        order: { type: Number, default: 0 },
      },
    ],
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Indexes
attributeSchema.index({ subcategory: 1, name: 1 })

const Attribute = model<IAttribute>('Attribute', attributeSchema)
export default Attribute
