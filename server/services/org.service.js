import Organization from "../models/organization.model.js"

const slugify = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "company"

// URL-safe, unique slug for the careers page (acme, acme-2, ...)
export const uniqueSlug = async (name, excludeId = null) => {
    const base = slugify(name)
    let slug = base
    for (let n = 2; ; n++) {
        const taken = await Organization.findOne({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }).select("_id")
        if (!taken) return slug
        slug = `${base}-${n}`
    }
}

export const createOrganization = async ({ name, website = "", about = "", createdBy }) =>
    Organization.create({ name, website, about, createdBy, slug: await uniqueSlug(name) })

// What job seekers see about a company
export const orgCard = (org) => org && { _id: org._id, companyName: org.name, companyWebsite: org.website, companyAbout: org.about, slug: org.slug }
