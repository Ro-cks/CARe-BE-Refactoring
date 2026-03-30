from app.services.scratch_comparison_service import compare_scratches_final


if __name__ == "__main__":
    sim, diff = compare_scratches_final("after.png", "before.png")
    print(f"유사도: {sim*100:.4f}%")
    print(f"변화량: {diff:.6f}")
