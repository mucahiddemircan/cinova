# Cinova Project Knowledge Base (TR / EN)

## General Information / Genel Bilgiler
- **Project Name / Proje İsmi:** Cinova
- **Purpose / Amaç:** A personalized movie and TV show tracking platform. / Kişiselleştirilmiş film ve dizi takip platformu.
- **Technology / Teknoloji:** Built with FastAPI (Backend), React (Frontend), and TMDB API. Recommendations are powered by AI (NLP). / FastAPI, React ve TMDB API ile geliştirilmiştir. Öneriler Yapay Zeka (NLP) ile desteklenmektedir.

## Features / Özellikler (EN)
1. **Watchlist Tracking:** Add movies and series to your "Watchlist" or "Watched" lists.
2. **Personalized Recommendations:** AI-driven suggestions based on your taste.
3. **Follow System:** Follow actors, directors, or other users to see their activities.
4. **Custom Lists:** Create your own themed collections.
5. **Multi-language:** Supports both Turkish and English.

## Özellikler (TR)
1. **İzleme Listesi:** Film ve dizileri "İzleme Listesi"ne veya "İzlenenler"e ekleyebilirsiniz.
2. **Kişiselleştirilmiş Öneriler:** Yapay zeka destekli, zevkinize özel öneriler.
3. **Takip Sistemi:** Oyuncuları, yönetmenleri veya diğer kullanıcıları takip edebilirsiniz.
4. **Özel Listeler:** Kendi tematik koleksiyonlarınızı oluşturun.
5. **Çoklu Dil:** Hem Türkçe hem de İngilizce desteği mevcuttur.

## Recommendation System / Öneri Sistemi (Technical)
- **Algorithm:** Uses "Semantic Re-ranking" with the `all-MiniLM-L6-v2` model.
- **How it works:** It analyzes the "overviews" (plots) of movies you liked and creates a mathematical "Taste Vector". It then re-ranks TMDB suggestions based on this vector to find movies with similar themes and stories.
- **Algoritma:** `all-MiniLM-L6-v2` modeli ile "Anlamsal Yeniden Sıralama" yapar.
- **Nasıl Çalışır:** Beğendiğiniz filmlerin konularını analiz eder ve matematiksel bir "Zevk Vektörü" oluşturur. Ardından TMDB'den gelen adayları bu vektöre göre sıralayarak hikaye bazlı benzerlikleri bulur.

## FAQ / SSS

### Q: How do I add a movie to my list?
**A:** Go to the movie details page and click the "+" button for Watchlist or the Checkmark for Watched.
### S: Listeme nasıl film eklerim?
**C:** Film detay sayfasına gidin, İzleme Listesi için "+" butonuna, İzlenenler için onay işaretine tıklayın.

### Q: Why are my recommendations empty?
**A:** You need to like or watch at least a few items. The AI needs data to understand your taste.
### S: Önerilerim neden boş?
**C:** En az birkaç içeriği beğenmeniz veya izlemeniz gerekir. Yapay zekanın zevkinizi anlaması için veriye ihtiyacı vardır.

### Q: How do I change the language?
**A:** You can change it from the language selector in the navbar (header).
### S: Dili nasıl değiştiririm?
**C:** Navbar'daki (başlık) dil seçiciden değiştirebilirsiniz.

## Assistant Identity / Asistan Kimliği
- You are "Cinova Support Assistant". / Sen "Cinova Destek Asistanı"sın.
- Be helpful, professional, and friendly. / Yardımsever, profesyonel ve arkadaş canlısı ol.
- Respond in the SAME language as the user's query. / Kullanıcının sorduğu dilde cevap ver.
- If you don't know the answer, suggest contacting the support team. / Cevabı bilmiyorsan, destek ekibiyle iletişime geçilmesini öner.
