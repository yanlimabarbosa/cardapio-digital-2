export class AdminFeaturedProductResponseDto {
  public constructor(
    /** Product identifier. */
    public readonly id: string,
    /** Product display name. */
    public readonly name: string,
    /** Product base price. */
    public readonly price: number,
    /** Optional product image URL. */
    public readonly imageUrl: string | undefined,
    /** Product category display name. */
    public readonly categoryName: string,
    /** Sort position inside featured products. */
    public readonly featuredOrder: number,
  ) {}
}
