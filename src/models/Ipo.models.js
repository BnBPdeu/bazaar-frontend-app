// models/IPO.js
import mongoose from "mongoose";

const useOfProceedsSchema = new mongoose.Schema(
  {
    purpose: { type: String, required: true },
    amountCr: { type: Number, required: true }, // amount in ₹ crore
  },
  { _id: false }
);

const financialYearSchema = new mongoose.Schema(
  {
    year: { type: String, required: true }, // e.g., "FY25"
    totalIncomeCr: { type: Number },
    niiCr: { type: Number },
    nonInterestIncomeCr: { type: Number },
    operatingProfitCr: { type: Number },
    netProfitCr: { type: Number },
    loanBookCr: { type: Number },
    gnpaPercent: { type: Number },
    netWorthCr: { type: Number },
  },
  { _id: false }
);

const ipoSchema = new mongoose.Schema(
  {
    // --- Existing fields (preserved) ---
    companyName: { type: String, required: true },
    symbol: { type: String, required: true, unique: true },
    lotSize: { type: Number, required: true }, // e.g., 10 shares per lot
    totalLots: { type: Number, required: true }, // total lots offered
    priceBand: { type: [Number], required: true }, // [min, max]
    status: {
      type: String,
      enum: ["upcoming", "open", "closed", "allocated", "listed"],
      default: "upcoming",
    },
    openTime: { type: Date, required: true }, // when bidding starts
    closeTime: { type: Date, required: true }, // when bidding ends
    allotmentTime: { type: Date, required: true },
    appliedUsers: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        lots: { type: Number, required: true },
      },
    ],
    allocatedUsers: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        lots: { type: Number, required: true },
      },
    ],
    openPrice: { type: Number, default: null }, // listing/market-open price after allocation
    circuitLimit: { type: Number, default: 10 }, // % up or down limit

    // --- New fields (added) ---
    image: { type: String, default: null }, // URL to company/IPO image or banner

    // High-level issue size details
    issueSizeCr: { type: Number, default: null }, // total ₹ crore
    issueBreakup: {
      freshIssueCr: { type: Number, default: null },
      ofsCr: { type: Number, default: null },
    },

    // Composition / scale
    totalSharesOffered: { type: Number, default: null }, // total equity shares
    anchorDate: { type: Date, default: null }, // anchor book date if applicable

    // Reservations by category (percentages)
    reservations: {
      retailPercent: { type: Number, default: null }, // e.g., 35
      qibPercent: { type: Number, default: null },
      hniPercent: { type: Number, default: null },
      employeePercent: { type: Number, default: null },
      otherPercent: { type: Number, default: null },
    },

    // Subscription status (multiples)
    subscription: {
      overallX: { type: Number, default: null },
      qibX: { type: Number, default: null },
      hniX: { type: Number, default: null },
      retailX: { type: Number, default: null },
      employeeX: { type: Number, default: null },
    },

    // Listing info
    listingPrice: { type: Number, default: null }, // discovered/listed price per share
    lotValueAtUpperBand: { type: Number, default: null }, // convenience: priceBand[1] * lotSize

    // Use of proceeds (structured)
    useOfProceeds: { type: [useOfProceedsSchema], default: [] },

    // Financial snapshots (optional, by FY)
    financials: { type: [financialYearSchema], default: [] },

    // Key ratios / statistics (point-in-time, e.g., latest FY)
    ratios: {
      roePercent: { type: Number, default: null }, // e.g., 12.2
      roaPercent: { type: Number, default: null }, // e.g., 1.6
      costToIncomePercent: { type: Number, default: null }, // e.g., 42
      carPercent: { type: Number, default: null }, // e.g., 16.5
      ltde: { type: Number, default: null }, // leverage (e.g., 4.5)
      impliedPE: { type: Number, default: null }, // based on upper band
      eps: { type: Number, default: null }, // e.g., FY25 EPS
    },

    // Qualitative factors
    benefits: { type: [String], default: [] }, // strengths / pros
    risks: { type: [String], default: [] }, // risk factors / cons
  },
  { timestamps: true }
);

// Helpful virtual to auto-compute lotValueAtUpperBand if not set
ipoSchema.pre("save", function (next) {
  if (
    (this.lotValueAtUpperBand == null || this.lotValueAtUpperBand === 0) &&
    Array.isArray(this.priceBand) &&
    this.priceBand.length === 2 &&
    typeof this.lotSize === "number"
  ) {
    this.lotValueAtUpperBand = Number(this.priceBand[1]) * Number(this.lotSize);
  }
  next();
});

export default mongoose.model("IPO", ipoSchema);
