import './Layout.css';

// The dashed box on blank pages that lists what the page will contain.
// Delete the <Planned /> line from a page once the real content is built.
function Planned({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="planned">
      <h2>Planned for this page</h2>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export default Planned;