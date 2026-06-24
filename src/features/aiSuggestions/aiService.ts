import { Product, ProductSubSeries } from "../products/types";

// Option A: Rule-based suggestions as a starting point.

export function generateSeoSuggestion(targetName: string, type: 'series' | 'subseries'): { title: string, description: string } {
    if (type === 'series') {
        return {
            title: `Buy ${targetName} Cricket Bats | Grainood Official`,
            description: `Discover the ${targetName} series by Grainood. Hand-crafted English Willow cricket bats designed for premium performance, power, and precision.`
        };
    }
    return {
        title: `${targetName} English Willow Bat | Grainood`,
        description: `Experience the ${targetName} English Willow cricket bat. Custom-built for elite performance with unmatched pickup and balance.`
    };
}

export function generateDescriptionSuggestion(targetName: string, tier: string): string {
    const isPremium = tier.toLowerCase() === 'premium' || tier.toLowerCase() === 'elite';
    if (isPremium) {
        return `The ${targetName} is the pinnacle of craftsmanship. Forged from the finest reserve-grade English willow, it features an imposing profile with exquisite balance, delivering effortless power for the discerning professional.`;
    }
    return `The ${targetName} offers reliable, match-ready performance. Handcrafted from quality English Willow, it provides an excellent balance of power and pickup for all-around play.`;
}

export function generatePriceSuggestion(tier: string, grade: string): { min: number, max: number, reason: string } {
    const t = tier.toLowerCase();
    const g = grade.toLowerCase();
    
    let base = 25000;
    let max = 35000;
    let reason = "Standard English Willow pricing for regular club cricketers.";

    if (g.includes('grade 1') || g.includes('player') || g.includes('reserve')) {
        base = 40000;
        max = 55000;
        reason = "Premium Grade 1 English Willow commands higher value due to pristine grain structure and elite performance.";
    } else if (g.includes('grade 2')) {
        base = 30000;
        max = 40000;
        reason = "Grade 2 English Willow provides excellent value with minor aesthetic blemishes but solid performance.";
    } else if (g.includes('grade 3') || g.includes('grade 4')) {
        base = 15000;
        max = 25000;
        reason = "Entry-level English Willow positioning for budget-conscious players.";
    }

    if (t === 'premium' || t === 'elite' || t === 'pro') {
        base += 10000;
        max += 15000;
        reason += ` The ${tier} tier positioning justifies a premium markup due to advanced customization options.`;
    }

    return { min: base, max, reason };
}

export function analyzeProductCompleteness(product: Product, subSeries?: ProductSubSeries) {
    let score = 100;
    const missing: string[] = [];

    // Analyze Series if no subseries provided
    if (!subSeries) {
        if (!product.tagline) { missing.push("Tagline"); score -= 10; }
        if (!product.basePrice) { missing.push("Base Price"); score -= 10; }
        if (!product.seoTitle) { missing.push("SEO Title"); score -= 5; }
        if (!product.seoDescription) { missing.push("SEO Description"); score -= 5; }
        
        return {
            score,
            missing,
            isReady: score >= 85
        };
    }

    // Analyze SubSeries
    if (!subSeries.basePrice) { missing.push("Base Price"); score -= 20; }
    if (!subSeries.grade) { missing.push("Willow Grade"); score -= 10; }
    if (!subSeries.shortDescription) { missing.push("Short Description"); score -= 10; }
    if (!subSeries.seoTitle) { missing.push("SEO Title"); score -= 5; }
    if (!subSeries.specs || !subSeries.specs.sweetSpot) { missing.push("Specs (Sweet Spot)"); score -= 5; }
    
    // Check for "Kashmir" which is not allowed per Grainood brand positioning usually
    if (subSeries.shortDescription?.toLowerCase().includes('kashmir') || subSeries.specs?.willowGrade?.toLowerCase().includes('kashmir')) {
        score -= 30;
        missing.push("Brand violation: Kashmir Willow mentioned (Grainood is English Willow only)");
    }

    return {
        score: Math.max(0, score),
        missing,
        isReady: score >= 85
    };
}

export function draftSupportReply(ticketType: string, customerData: any): string {
    if (ticketType === 'order_query') {
        return `Hi ${customerData.name},\n\nThank you for reaching out regarding your order. We are currently reviewing your request and our workshop team will provide an update shortly.\n\nBest regards,\nGrainood Support Team`;
    }
    if (ticketType === 'warranty_claim') {
        return `Hi ${customerData.name},\n\nWe received your warranty claim. At Grainood, we stand by our craftsmanship. To proceed, could you please provide a few clear photos of the bat (front face, toe, and the area of concern) along with your original receipt number?\n\nBest regards,\nGrainood Support Team`;
    }
    return `Hi ${customerData.name},\n\nThank you for contacting Grainood. Our team has received your message and will get back to you within 24 hours.\n\nBest regards,\nGrainood Support Team`;
}

export function qualifyEnquiry(message: string, productOfInterest: string): string {
    const msg = message.toLowerCase();
    if (msg.includes('discount') || msg.includes('cheaper') || msg.includes('lowest price')) {
        return 'Price-sensitive';
    }
    if (msg.includes('urgent') || msg.includes('buy now') || msg.includes('ready to order')) {
        return 'Hot lead';
    }
    if (msg.includes('custom') || msg.includes('engrave') || msg.includes('specific weight')) {
        return 'Custom-build request';
    }
    if (productOfInterest && (productOfInterest.toLowerCase().includes('premium') || productOfInterest.toLowerCase().includes('elite'))) {
        return 'Premium buyer';
    }
    if (msg.split(' ').length < 10) {
        return 'Needs more info';
    }
    return 'General Inquiry';
}

export function draftEnquiryReply(customerName: string, productOfInterest: string): string {
    return `Hi ${customerName},\n\nThank you for your interest in Grainood. I noticed you were inquiring about ${productOfInterest || 'our cricket bats'}.\n\nOur bats are handcrafted from premium English Willow. Could you let me know if you are looking for a specific weight or profile, or if you had any questions about the customization process?\n\nLooking forward to assisting you.\n\nBest regards,\nGrainood Sales Team`;
}
