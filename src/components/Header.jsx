import './Header.css';

export default function Header({ title = "Wykorzystaj puste przebiegi!", subtitle = "Znajdź lub zaoferuj transport powrotny lawet i busów w całej Europie. Prosto i szybko!" }) {
  return (
    <div className="overlay-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
}
