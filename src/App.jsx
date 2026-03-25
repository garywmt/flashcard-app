import React, { useEffect, useMemo, useRef, useState } from 'react';

const starterCards = [
  {
    id: crypto.randomUUID(),
    commonName: 'Bald Eagle',
    scientificName: 'Haliaeetus leucocephalus',
    category: 'Raptors',
    attributes: 'Large raptor; white head and tail in adults; yellow bill; often near water.',
    notes: 'Immatures are mottled brown and can be confused with golden eagles.',
    photos: [
      'https://images.unsplash.com/photo-1501706362039-c6e80948dc0f?auto=format&fit=crop&w=1200&q=80'
    ]
  },
  {
    id: crypto.randomUUID(),
    commonName: 'Quaking Aspen',
    scientificName: 'Populus tremuloides',
    category: 'Plants',
    attributes: 'Rounded leaves with flattened petioles; smooth pale bark; leaves tremble in wind.',
    notes: 'Often forms large clonal stands and grows well in mountain habitats.',
    photos: [
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80'
    ]
  }
];

const emptyForm = {
  commonName: '',
  scientificName: '',
  category: 'Plants',
  attributes: '',
  notes: '',
  photoUrls: ''
};

function safeParseCards(text) {
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return null;
    return parsed.map((item, index) => ({
      id: item.id || `import-${index}-${Date.now()}`,
      commonName: item.commonName || item.title || item.name || 'Untitled species',
      scientificName: item.scientificName || '',
      category: item.category || 'General',
      attributes: item.attributes || '',
      notes: item.notes || '',
      photos: Array.isArray(item.photos)
        ? item.photos.filter(Boolean)
        : item.image
          ? [item.image]
          : []
    }));
  } catch {
    return null;
  }
}

function shuffleArray(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizePhotos(photoUrlsText, uploadedPhotos) {
  const typedUrls = photoUrlsText
    .split('\n')
    .map((url) => url.trim())
    .filter(Boolean);
  return [...uploadedPhotos, ...typedUrls];
}

function App() {
  const [cards, setCards] = useState(() => {
    const saved = localStorage.getItem('species-flashcards-v1');
    if (!saved) return starterCards;
    const parsed = safeParseCards(saved);
    return parsed && parsed.length ? parsed : starterCards;
  });

  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('study');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [zoomedPhoto, setZoomedPhoto] = useState('');
  const [importText, setImportText] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [quizState, setQuizState] = useState({
    active: false,
    pool: [],
    questionIndex: 0,
    choices: [],
    selected: '',
    revealed: false,
    score: 0
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('species-flashcards-v1', JSON.stringify(cards));
  }, [cards]);

  const categories = useMemo(() => ['All', ...new Set(cards.map((card) => card.category || 'General'))], [cards]);

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const text = `${card.commonName} ${card.scientificName} ${card.attributes} ${card.notes}`.toLowerCase();
      const matchesSearch = !search || text.includes(search.toLowerCase());
      const matchesFilter = filter === 'All' || card.category === filter;
      return matchesSearch && matchesFilter;
    });
  }, [cards, search, filter]);

  const currentCard = filteredCards[currentIndex] || null;
  const currentPhoto = currentCard?.photos?.[currentPhotoIndex] || '';

  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setCurrentPhotoIndex(0);
  }, [search, filter]);

  useEffect(() => {
    setCurrentPhotoIndex(0);
  }, [currentIndex]);

  function addCard() {
    if (!form.commonName.trim()) {
      alert('Please enter a species name before adding the card.');
      return;
    }
    const photos = normalizePhotos(form.photoUrls, uploadedPhotos);
    const newCard = {
      id: crypto.randomUUID(),
      commonName: form.commonName.trim(),
      scientificName: form.scientificName.trim(),
      category: form.category.trim() || 'General',
      attributes: form.attributes.trim(),
      notes: form.notes.trim(),
      photos
    };
    setCards((prev) => [newCard, ...prev]);
    setForm(emptyForm);
    setUploadedPhotos([]);
    setMode('study');
  }

  function deleteCurrentCard() {
    if (!currentCard) return;
    const nextCards = cards.filter((card) => card.id !== currentCard.id);
    setCards(nextCards);
    setCurrentIndex(0);
    setIsFlipped(false);
  }

  function nextCard() {
    if (!filteredCards.length) return;
    setCurrentIndex((prev) => (prev + 1) % filteredCards.length);
    setIsFlipped(false);
  }

  function previousCard() {
    if (!filteredCards.length) return;
    setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
    setIsFlipped(false);
  }

  function shuffleCards() {
    setCards((prev) => shuffleArray(prev));
    setCurrentIndex(0);
    setIsFlipped(false);
  }

  function exportDeck() {
    const blob = new Blob([JSON.stringify(cards, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'species-flashcards.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importDeck() {
    const parsed = safeParseCards(importText);
    if (!parsed) {
      alert('That JSON could not be imported. Please check the format.');
      return;
    }
    setCards(parsed);
    setCurrentIndex(0);
    setIsFlipped(false);
    setMode('study');
  }

  function handlePhotoUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedPhotos((prev) => [...prev, String(reader.result)]);
      };
      reader.readAsDataURL(file);
    });

    event.target.value = '';
  }

  function removeUploadedPhoto(indexToRemove) {
    setUploadedPhotos((prev) => prev.filter((_, index) => index !== indexToRemove));
  }

  function startQuiz() {
    if (filteredCards.length < 4) {
      alert('Quiz mode works best with at least 4 cards in the current filtered deck.');
      return;
    }

    const pool = shuffleArray(filteredCards);
    const firstQuestion = buildQuizQuestion(pool, 0);
    setQuizState({
      active: true,
      pool,
      questionIndex: 0,
      choices: firstQuestion.choices,
      selected: '',
      revealed: false,
      score: 0
    });
    setMode('quiz');
  }

  function buildQuizQuestion(pool, index) {
    const answer = pool[index];
    const distractors = shuffleArray(
      pool.filter((card) => card.id !== answer.id)
    ).slice(0, 3);
    const choices = shuffleArray([answer, ...distractors]);
    return { answer, choices };
  }

  function submitQuizAnswer(choiceId) {
    if (quizState.revealed) return;
    const currentQuestion = quizState.pool[quizState.questionIndex];
    const isCorrect = choiceId === currentQuestion.id;
    setQuizState((prev) => ({
      ...prev,
      selected: choiceId,
      revealed: true,
      score: isCorrect ? prev.score + 1 : prev.score
    }));
  }

  function nextQuizQuestion() {
    const nextIndex = quizState.questionIndex + 1;
    if (nextIndex >= quizState.pool.length) {
      setQuizState((prev) => ({ ...prev, active: false }));
      return;
    }
    const nextQuestion = buildQuizQuestion(quizState.pool, nextIndex);
    setQuizState((prev) => ({
      ...prev,
      questionIndex: nextIndex,
      choices: nextQuestion.choices,
      selected: '',
      revealed: false
    }));
  }

  const quizAnswer = quizState.pool[quizState.questionIndex] || null;

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Species study tool</p>
          <h1>Build flashcards for plants, raptors, and anything else you want to learn.</h1>
          <p className="hero-text">
            Upload multiple photos per species, zoom in on details, study by flipping cards, and test yourself in quiz mode.
          </p>
        </div>
        <div className="hero-actions">
          <button className={mode === 'study' ? 'button primary' : 'button'} onClick={() => setMode('study')}>Study mode</button>
          <button className={mode === 'quiz' ? 'button primary' : 'button'} onClick={startQuiz}>Quiz mode</button>
          <button className="button" onClick={() => setMode('manage')}>Manage deck</button>
        </div>
      </header>

      <main className="layout-grid">
        <aside className="panel sidebar">
          <h2>Deck controls</h2>
          <label>
            Search
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search species" />
          </label>

          <label>
            Category
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>

          <div className="button-row wrap">
            <button className="button" onClick={shuffleCards}>Shuffle</button>
            <button className="button" onClick={() => { setCurrentIndex(0); setIsFlipped(false); }}>Reset</button>
            <button className="button danger" onClick={deleteCurrentCard}>Delete current</button>
          </div>

          <div className="stats-box">
            <div><strong>Total cards:</strong> {cards.length}</div>
            <div><strong>Filtered cards:</strong> {filteredCards.length}</div>
            {mode === 'study' && filteredCards.length > 0 && (
              <div><strong>Position:</strong> {currentIndex + 1} / {filteredCards.length}</div>
            )}
            {mode === 'quiz' && quizAnswer && (
              <div><strong>Quiz score:</strong> {quizState.score} / {quizState.questionIndex + (quizState.revealed ? 1 : 0)}</div>
            )}
          </div>

          <hr />

          <h2>Add a species</h2>
          <label>
            Common name
            <input value={form.commonName} onChange={(e) => setForm((prev) => ({ ...prev, commonName: e.target.value }))} placeholder="Northern Harrier" />
          </label>

          <label>
            Scientific name
            <input value={form.scientificName} onChange={(e) => setForm((prev) => ({ ...prev, scientificName: e.target.value }))} placeholder="Circus hudsonius" />
          </label>

          <label>
            Category
            <input value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} placeholder="Raptors" />
          </label>

          <label>
            Attributes
            <textarea value={form.attributes} onChange={(e) => setForm((prev) => ({ ...prev, attributes: e.target.value }))} placeholder="Shape, behavior, habitat, field marks" />
          </label>

          <label>
            Notes
            <textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Anything else you want to remember" />
          </label>

          <label>
            Photo URLs (one per line)
            <textarea value={form.photoUrls} onChange={(e) => setForm((prev) => ({ ...prev, photoUrls: e.target.value }))} placeholder="https://example.com/photo1.jpg\nhttps://example.com/photo2.jpg" />
          </label>

          <div className="button-row wrap">
            <button className="button" onClick={() => fileInputRef.current?.click()}>Upload photo files</button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handlePhotoUpload} />
            <button className="button primary" onClick={addCard}>Add card</button>
          </div>

          {uploadedPhotos.length > 0 && (
            <div className="thumbnail-grid compact">
              {uploadedPhotos.map((photo, index) => (
                <div className="thumb-wrap" key={`${photo}-${index}`}>
                  <img src={photo} alt={`Uploaded ${index + 1}`} className="thumb" />
                  <button className="mini-button" onClick={() => removeUploadedPhoto(index)}>×</button>
                </div>
              ))}
            </div>
          )}

          <hr />

          <h2>Import / export</h2>
          <div className="button-row wrap">
            <button className="button" onClick={exportDeck}>Export JSON</button>
            <button className="button" onClick={importDeck}>Import JSON</button>
          </div>
          <textarea
            className="code-box"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Paste deck JSON here"
          />
        </aside>

        <section className="panel main-panel">
          {mode === 'study' && (
            <>
              {!currentCard ? (
                <div className="empty-state">No cards match the current filter.</div>
              ) : (
                <>
                  <div className="card-header-row">
                    <div>
                      <p className="eyebrow">Study mode</p>
                      <h2>{currentCard.commonName}</h2>
                    </div>
                    <div className="button-row">
                      <button className="button" onClick={previousCard}>Previous</button>
                      <button className="button primary" onClick={() => setIsFlipped((prev) => !prev)}>
                        {isFlipped ? 'Show photos' : 'Reveal answer'}
                      </button>
                      <button className="button" onClick={nextCard}>Next</button>
                    </div>
                  </div>

                  <div className="flashcard" onClick={() => setIsFlipped((prev) => !prev)}>
                    {!isFlipped ? (
                      <div className="flashcard-front">
                        {currentPhoto ? (
                          <>
                            <img src={currentPhoto} alt={currentCard.commonName} className="hero-photo" />
                            <div className="photo-toolbar">
                              <button className="button" onClick={(e) => { e.stopPropagation(); setZoomedPhoto(currentPhoto); }}>Zoom photo</button>
                              {currentCard.photos.length > 1 && (
                                <div className="button-row wrap">
                                  {currentCard.photos.map((_, index) => (
                                    <button
                                      key={index}
                                      className={index === currentPhotoIndex ? 'button primary small' : 'button small'}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentPhotoIndex(index);
                                      }}
                                    >
                                      {index + 1}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            {currentCard.photos.length > 1 && (
                              <div className="thumbnail-grid">
                                {currentCard.photos.map((photo, index) => (
                                  <button
                                    className={index === currentPhotoIndex ? 'thumb-button active' : 'thumb-button'}
                                    key={`${photo}-${index}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCurrentPhotoIndex(index);
                                    }}
                                  >
                                    <img src={photo} alt={`${currentCard.commonName} ${index + 1}`} className="thumb" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="empty-photo">No photo on this card yet.</div>
                        )}
                        <p className="flip-hint">Click the card to reveal the answer.</p>
                      </div>
                    ) : (
                      <div className="flashcard-back">
                        <p className="eyebrow">Answer side</p>
                        <h2>{currentCard.commonName}</h2>
                        {currentCard.scientificName && <p className="scientific-name">{currentCard.scientificName}</p>}
                        <p><strong>Category:</strong> {currentCard.category}</p>
                        <p><strong>Attributes:</strong> {currentCard.attributes || '—'}</p>
                        <p><strong>Notes:</strong> {currentCard.notes || '—'}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {mode === 'quiz' && (
            <>
              {!quizState.active || !quizAnswer ? (
                <div className="empty-state">
                  <h2>Quiz complete</h2>
                  <p>Your final score was {quizState.score} out of {quizState.pool.length || 0}.</p>
                  <div className="button-row center">
                    <button className="button primary" onClick={startQuiz}>Start another quiz</button>
                    <button className="button" onClick={() => setMode('study')}>Back to study mode</button>
                  </div>
                </div>
              ) : (
                <div className="quiz-layout">
                  <div className="card-header-row">
                    <div>
                      <p className="eyebrow">Quiz mode</p>
                      <h2>Question {quizState.questionIndex + 1} of {quizState.pool.length}</h2>
                    </div>
                    <div className="score-pill">Score: {quizState.score}</div>
                  </div>

                  <div className="quiz-photo-card">
                    {quizAnswer.photos?.[0] ? (
                      <>
                        <img src={quizAnswer.photos[0]} alt="Quiz species" className="hero-photo" />
                        <div className="button-row center">
                          <button className="button" onClick={() => setZoomedPhoto(quizAnswer.photos[0])}>Zoom photo</button>
                        </div>
                      </>
                    ) : (
                      <div className="empty-photo">No photo available for this species.</div>
                    )}
                  </div>

                  <div className="quiz-options">
                    {quizState.choices.map((choice) => {
                      let className = 'quiz-option';
                      if (quizState.revealed && choice.id === quizAnswer.id) className += ' correct';
                      if (quizState.revealed && choice.id === quizState.selected && choice.id !== quizAnswer.id) className += ' incorrect';
                      return (
                        <button key={choice.id} className={className} onClick={() => submitQuizAnswer(choice.id)}>
                          <span>{choice.commonName}</span>
                          {choice.scientificName && <small>{choice.scientificName}</small>}
                        </button>
                      );
                    })}
                  </div>

                  {quizState.revealed && (
                    <div className="quiz-feedback">
                      <h3>{quizState.selected === quizAnswer.id ? 'Correct' : 'Not quite'}</h3>
                      <p><strong>Answer:</strong> {quizAnswer.commonName} {quizAnswer.scientificName ? `(${quizAnswer.scientificName})` : ''}</p>
                      <p><strong>Attributes:</strong> {quizAnswer.attributes || '—'}</p>
                      <div className="button-row">
                        <button className="button primary" onClick={nextQuizQuestion}>Next question</button>
                        <button className="button" onClick={() => setMode('study')}>Stop quiz</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {mode === 'manage' && (
            <div className="manage-view">
              <p className="eyebrow">Deck overview</p>
              <h2>All cards</h2>
              <div className="manage-grid">
                {filteredCards.map((card) => (
                  <article className="manage-card" key={card.id}>
                    {card.photos?.[0] ? <img src={card.photos[0]} alt={card.commonName} className="manage-photo" /> : <div className="empty-photo small">No photo</div>}
                    <h3>{card.commonName}</h3>
                    {card.scientificName && <p className="scientific-name">{card.scientificName}</p>}
                    <p><strong>Category:</strong> {card.category}</p>
                    <p><strong>Photos:</strong> {card.photos?.length || 0}</p>
                    <p className="truncate"><strong>Attributes:</strong> {card.attributes || '—'}</p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {zoomedPhoto && (
        <div className="modal-overlay" onClick={() => setZoomedPhoto('')}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="button-row end">
              <button className="button" onClick={() => setZoomedPhoto('')}>Close</button>
            </div>
            <img src={zoomedPhoto} alt="Zoomed species" className="zoomed-image" />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
