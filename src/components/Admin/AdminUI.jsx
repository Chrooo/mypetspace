import { Pagination, Spin } from 'antd';

// "2026-10-14 14:00:00"
const two = (n) => String(n).padStart(2, '0');
export const fmtDateTime = (value) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
};

// filter pills: options = [{ label, value }]
export function Pills({ options, value, onChange }) {
  return options.map((o) => (
    <button key={o.value} className={`adm-pill${o.value === value ? ' on' : ''}`} onClick={() => onChange(o.value)}>
      {o.label}
    </button>
  ));
}

// the "Sort by" drop-down
export function SortSelect({ value, onChange }) {
  return (
    <select className="adm-sort" value={value || ''} onChange={(e) => onChange(e.target.value)} aria-label="Sort by">
      <option value="" disabled hidden>Sort by</option>
      <option value="latest">Latest</option>
      <option value="oldest">Oldest</option>
      <option value="alphabetical">Alphabetical</option>
      <option value="default">Default</option>
    </select>
  );
}

// The maroon table with the numbered first column and page numbers underneath.
//   columns: [{ title, render(row), bold?, joinPrev? }]
//   joinPrev: this column has no heading of its own: the heading before it stretches over both
//   (used for the two Action buttons, View and Confirm, side by side)
function DataTable({ columns, rows, page, pageSize, total, onPage, loading, empty = 'Nothing to show yet.' }) {
  return (
    <Spin spinning={!!loading}>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>No.</th>
              {columns.map((c, i) =>
                c.joinPrev ? null : (
                  <th key={c.title} className={c.bold ? 'b' : ''} colSpan={columns[i + 1]?.joinPrev ? 2 : 1}>{c.title}</th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row._id}>
                <td>{(page - 1) * pageSize + i + 1}</td>
                {columns.map((c, i) => (
                  <td key={`${c.title}-${i}`}>{c.render(row)}</td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="adm-empty">
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        className="adm-pages"
        current={page}
        pageSize={pageSize}
        total={total}
        showSizeChanger={false}
        hideOnSinglePage
        onChange={onPage}
      />
    </Spin>
  );
}

export default DataTable;