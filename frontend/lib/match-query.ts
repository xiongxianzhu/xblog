/** 列表模糊搜索：任一字段包含关键词（不区分大小写）。 */
export function matchQuery(query: string, ...values: (string | number | null | undefined)[]): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return values.some((value) => {
    if (value == null) return false;
    return String(value).toLowerCase().includes(needle);
  });
}
