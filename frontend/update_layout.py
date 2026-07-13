import sys

with open('src/app/page.tsx', 'r') as f:
    content = f.read()

# We need to replace everything from the first "return (" that starts the component
# We can find it by looking for "  return (" followed by "    <div style={{ paddingBottom: '6rem', position: 'relative' }}>"
target_start = "  return (\n    <div style={{ paddingBottom: '6rem', position: 'relative' }}>"

# The part we want to KEEP is everything from "{/* Right Content Panel: Outline, Previews, SEO Analysis (Now below the horizontal grid) */}"
target_end = "        {/* Right Content Panel: Outline, Previews, SEO Analysis (Now below the horizontal grid) */}"

if target_start in content and target_end in content:
    idx_start = content.find(target_start)
    idx_end = content.find(target_end)
    
    before = content[:idx_start]
    after = content[idx_end:] # This starts at the comment
    
    # We need to change the wrapping of 'after'
    # Currently 'after' ends with:
    #         </main>
    #       </div>
    #     </div>
    #   );
    # }
    
    # Let's replace the end closing tags
    after = after.replace("        </main>\n      </div>\n    </div>\n  );\n}", "      </div>\n    </main>\n  </div>\n  );\n}")
    
    # We remove the old `<main className="glass-panel"...>` and replace it with just a div because the new layout already has a <main>
    after = after.replace('<main className="glass-panel" style={{ minHeight: \'500px\', display: \'flex\', flexDirection: \'column\', width: \'100%\' }}>', '<div className="glass-panel mt-8" style={{ minHeight: \'500px\', display: \'flex\', flexDirection: \'column\', width: \'100%\' }}>')
    after = after.replace('</main>\n      </div>\n    </main>', '</div>\n      </div>\n    </main>')
    
    new_ui = """  return (
    <>
      {/* SideNavBar */}
      <nav aria-label="Main Navigation" className="fixed left-0 top-0 h-full flex flex-col py-margin-desktop z-40 bg-surface-container-lowest border-r border-outline-variant/30 w-[260px] hidden md:flex transition-all duration-300 group">
        <div className="px-gutter mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-on-primary shadow-md shadow-primary/20">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </div>
          <div>
            <h1 className="text-[18px] font-headline-md font-black text-primary truncate leading-tight">Command Center</h1>
            <p className="text-caption font-caption text-on-surface-variant truncate">Autonomous Mode Active</p>
          </div>
        </div>
        <div className="px-gutter mb-6">
          <button className="w-full bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-md shadow-primary/10">
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Project
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 space-y-2">
          <a aria-current="page" className="flex items-center gap-3 px-4 py-3 rounded-lg text-primary bg-primary/10 text-label-md font-label-md transition-all duration-200 translate-x-1" href="#">
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            Dashboard
          </a>
          <a className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-all text-label-md font-label-md" href="#">
            <span className="material-symbols-outlined text-[20px]">folder_copy</span>
            Projects
          </a>
          <a className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-all text-label-md font-label-md" href="#">
            <span className="material-symbols-outlined text-[20px]">alt_route</span>
            CMS Integrations
          </a>
          <a className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-all text-label-md font-label-md" href="#">
            <span className="material-symbols-outlined text-[20px]">settings</span>
            Settings
          </a>
        </div>
        <div className="mt-auto px-4 space-y-2 border-t border-outline-variant/30 pt-4">
          <a className="flex items-center gap-3 px-4 py-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-all text-label-md font-label-md" href="#">
            <span className="material-symbols-outlined text-[18px]">help</span>
            Help
          </a>
          <a className="flex items-center gap-3 px-4 py-2 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-all text-label-md font-label-md" href="#">
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Sign Out
          </a>
        </div>
      </nav>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col md:pl-[260px] min-w-0 transition-all duration-300">
        
        {/* TopAppBar */}
        <header className="fixed top-0 left-0 md:left-[260px] w-full md:w-[calc(100%-260px)] z-50 flex justify-between items-center px-margin-desktop h-16 bg-surface-container-lowest/80 backdrop-blur-md border-b border-outline-variant/30 shadow-sm transition-all duration-300">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
              <input className="w-full bg-surface-container-low border border-outline-variant/30 rounded-full py-2 pl-10 pr-4 text-body-md font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-on-surface-variant/70" placeholder="⌘K Arama..." type="text" />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button aria-label="Notifications" className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button aria-label="History" className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors hidden sm:flex">
              <span className="material-symbols-outlined">history</span>
            </button>
            <button className="bg-primary/10 hover:bg-primary/20 text-primary font-label-md text-label-md py-2 px-4 rounded-full transition-colors hidden md:block border border-primary/20">
              Execute Task
            </button>
            <div className="w-8 h-8 rounded-full bg-surface-container-highest overflow-hidden border border-outline-variant/30 ml-2 shadow-sm">
              <img alt="User profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAPxkygmBr1N_F3ikyPaHw-NeaSzdR8cC6AlsYBaVwSHSxCud3sZ16g4FgnDnEmFvvnPpOw36k8HvXZEbPzzq8WuW-VDSW2y_Pm2oZaGSWYzp0Wd7vGypxZ7QfxKYvkEvdVq2vykTZ1BH6C3YYUO7W46sHXjbFcET-YagPHvu3bwDcU_sW3-1zUpMGX-viZvIXk7qvB92DJ_QTe0w2Qkya2oOKtbFWt5K062LO4plY4OlwBuDsu58JxBW_wtWWsZFe7IUuFi_7lagWi" />
            </div>
          </div>
        </header>

        {/* Main Dashboard Canvas */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto pt-24 pb-margin-desktop px-margin-mobile md:px-margin-desktop bg-background">
          <div className="max-w-[1440px] mx-auto space-y-6">
            
            {/* Advanced Command Center */}
            <section className="bg-surface-container-lowest border border-outline-variant/30 shadow-md rounded-xl p-6 glow-border relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center relative z-10">
                <div className="flex-1 w-full relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary text-[24px]">rocket_launch</span>
                  <input 
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg py-4 pl-12 pr-4 text-body-lg font-body-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner" 
                    placeholder="Gelişmiş Görev için anahtar kelime girin..." 
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && keyword.trim()) {
                        handleGenerate();
                      }
                    }}
                  />
                </div>
                <div className="flex flex-wrap md:flex-nowrap gap-3 w-full md:w-auto">
                  <select 
                    className="bg-surface-container-low border border-outline-variant/30 text-on-surface font-body-md rounded-lg px-3 py-2 focus:ring-primary focus:border-primary cursor-pointer"
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                  >
                    <option value="1">1 Rakip (Hızlı)</option>
                    <option value="3">3 Rakip (Dengeli)</option>
                    <option value="5">5 Rakip (Kapsamlı)</option>
                    <option value="10">10 Rakip (Maksimum)</option>
                  </select>
                  <select 
                    className="bg-surface-container-low border border-outline-variant/30 text-on-surface font-body-md rounded-lg px-3 py-2 focus:ring-primary focus:border-primary cursor-pointer"
                    value={tone}
                    onChange={(e) => setTone(e.target.value as any)}
                  >
                    <option value="professional">Ton: Profesyonel</option>
                    <option value="casual">Ton: Yaratıcı</option>
                    <option value="academic">Ton: Akademik</option>
                    <option value="sales">Ton: Satış Odaklı</option>
                  </select>
                  <select 
                    className="bg-surface-container-low border border-outline-variant/30 text-on-surface font-body-md rounded-lg px-3 py-2 focus:ring-primary focus:border-primary cursor-pointer"
                    value={size}
                    onChange={(e) => setSize(e.target.value as any)}
                  >
                    <option value="comprehensive">Uzunluk: Pillar</option>
                    <option value="balanced">Uzunluk: Dengeli</option>
                    <option value="short">Uzunluk: Kısa</option>
                  </select>
                  <button 
                    onClick={handleGenerate}
                    disabled={loading || !keyword.trim()}
                    className="bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md py-2 px-6 rounded-lg transition-all shadow-md shadow-primary/20 flex-shrink-0 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                    ) : (
                      <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                    )}
                    Başlat
                  </button>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Active Task & Stats */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Active Task Pipeline */}
                <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-6 shadow-md">
                  <h2 className="text-[20px] font-headline-md text-on-surface mb-6 flex items-center gap-2">
                    <span className={`material-symbols-outlined text-primary text-[20px] ${currentStep > 0 && currentStep < 5 ? 'animate-pulse-slow' : ''}`}>memory</span>
                    Aktif İşlem: {keyword ? `"${keyword}"` : "Bekleniyor..."}
                  </h2>
                  
                  <div className="relative">
                    {/* Connecting Line */}
                    <div className="absolute top-6 left-8 right-8 h-0.5 bg-surface-variant z-0 rounded-full">
                      <div 
                        className="h-full bg-primary rounded-full shadow-[0_0_8px_rgba(70,72,212,0.4)] transition-all duration-500"
                        style={{ width: `${currentStep === 0 ? 0 : (currentStep / 4) * 100}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between relative z-10">
                      {/* Step 1 */}
                      <div className="flex flex-col items-center gap-2 w-1/4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm relative bg-surface-container-lowest transition-colors duration-300 ${currentStep >= 1 ? 'bg-primary/10 border-2 border-primary text-primary shadow-[0_0_10px_rgba(70,72,212,0.2)]' : 'border-2 border-outline-variant text-on-surface-variant'}`}>
                          <span className="material-symbols-outlined text-[24px]">bug_report</span>
                          {currentStep === 1 && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-tertiary-container rounded-full border-2 border-surface-container-lowest flex items-center justify-center animate-pulse"></div>}
                        </div>
                        <div className="text-center">
                          <p className={`text-body-md font-body-md ${currentStep >= 1 ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}`}>Scraping</p>
                          <p className={`text-[10px] font-label-md ${currentStep === 1 ? 'text-primary' : 'text-on-surface-variant/70'}`}>
                            {currentStep > 1 ? 'Tamamlandı' : currentStep === 1 ? 'Aktif' : 'Bekliyor'}
                          </p>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="flex flex-col items-center gap-2 w-1/4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-300 ${currentStep >= 2 ? 'bg-primary/10 border-2 border-primary text-primary shadow-[0_0_10px_rgba(70,72,212,0.2)]' : 'border-2 border-outline-variant text-on-surface-variant bg-surface-container-lowest'}`}>
                          <span className="material-symbols-outlined text-[24px]">psychology</span>
                          {currentStep === 2 && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-tertiary-container rounded-full border-2 border-surface-container-lowest flex items-center justify-center animate-pulse"></div>}
                        </div>
                        <div className="text-center">
                          <p className={`text-body-md font-body-md ${currentStep >= 2 ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}`}>AI Analiz</p>
                          <p className={`text-[10px] font-label-md ${currentStep === 2 ? 'text-primary' : 'text-on-surface-variant/70'}`}>
                            {currentStep > 2 ? 'Tamamlandı' : currentStep === 2 ? 'Aktif' : 'Bekliyor'}
                          </p>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="flex flex-col items-center gap-2 w-1/4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-300 ${currentStep >= 3 ? 'bg-primary/10 border-2 border-primary text-primary shadow-[0_0_10px_rgba(70,72,212,0.2)]' : 'border-2 border-outline-variant text-on-surface-variant bg-surface-container-lowest'}`}>
                          <span className="material-symbols-outlined text-[24px]">edit_document</span>
                          {currentStep === 3 && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-tertiary-container rounded-full border-2 border-surface-container-lowest flex items-center justify-center animate-pulse"></div>}
                        </div>
                        <div className="text-center">
                          <p className={`text-body-md font-body-md ${currentStep >= 3 ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}`}>Taslak</p>
                          <p className={`text-[10px] font-label-md ${currentStep === 3 ? 'text-primary' : 'text-on-surface-variant/70'}`}>
                            {currentStep > 3 ? 'Tamamlandı' : currentStep === 3 ? 'Aktif' : 'Bekliyor'}
                          </p>
                        </div>
                      </div>

                      {/* Step 4 */}
                      <div className="flex flex-col items-center gap-2 w-1/4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-300 ${currentStep >= 4 ? 'bg-primary/10 border-2 border-primary text-primary shadow-[0_0_10px_rgba(70,72,212,0.2)]' : 'border-2 border-outline-variant text-on-surface-variant bg-surface-container-lowest'}`}>
                          <span className="material-symbols-outlined text-[24px]">publish</span>
                          {currentStep === 4 && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-tertiary-container rounded-full border-2 border-surface-container-lowest flex items-center justify-center animate-pulse"></div>}
                        </div>
                        <div className="text-center">
                          <p className={`text-body-md font-body-md ${currentStep >= 4 ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}`}>Yayın</p>
                          <p className={`text-[10px] font-label-md ${currentStep === 4 ? 'text-primary' : 'text-on-surface-variant/70'}`}>
                            {currentStep > 4 ? 'Tamamlandı' : currentStep === 4 ? 'Aktif' : 'Bekliyor'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-5 hover:shadow-md transition-shadow shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-[18px]">article</span>
                      </div>
                      <p className="text-caption font-caption text-on-surface-variant">Toplam Makale</p>
                    </div>
                    <p className="text-headline-lg font-headline-lg text-on-surface">1,248</p>
                    <p className="text-[11px] text-secondary mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">trending_up</span> +12 bu hafta</p>
                  </div>
                  
                  <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-5 hover:shadow-md transition-shadow shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-md bg-tertiary-container/10 flex items-center justify-center text-tertiary-container">
                        <span className="material-symbols-outlined text-[18px]">leaderboard</span>
                      </div>
                      <p className="text-caption font-caption text-on-surface-variant">Ortalama SERP</p>
                    </div>
                    <p className="text-headline-lg font-headline-lg text-on-surface">4.2</p>
                    <p className="text-[11px] text-secondary mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">trending_up</span> -0.3 iyileşme</p>
                  </div>
                  
                  <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-5 hover:shadow-md transition-shadow shadow-sm relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-primary/5 rounded-full blur-xl"></div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-[18px]">queue</span>
                      </div>
                      <p className="text-caption font-caption text-on-surface-variant">Otopilot Kuyruğu</p>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <p className="text-headline-lg font-headline-lg text-on-surface">{autopilotKeywords.length}<span className="text-[20px] text-on-surface-variant/70">/24</span></p>
                    </div>
                    <p className="text-[11px] text-primary mt-1 flex items-center gap-1">Aktif Görevler</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Queue Sidebar */}
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-5 shadow-md h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[18px] font-headline-md text-on-surface">Bekleyen Görevler</h3>
                  <span className="bg-surface-container-low text-on-surface-variant text-[10px] px-2 py-0.5 rounded-full font-label-md border border-outline-variant/30">{autopilotKeywords.length} Total</span>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                  {autopilotKeywords.length === 0 ? (
                    <div className="text-center p-4 text-sm text-on-surface-variant border border-dashed border-outline-variant rounded-lg">
                      Kuyrukta bekleyen işlem yok.
                    </div>
                  ) : (
                    autopilotKeywords.map((item, idx) => (
                      <div key={item.id} className="bg-surface-container-low hover:bg-surface-container border border-outline-variant/20 rounded-lg p-3 transition-colors cursor-pointer group">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-body-md font-body-md font-medium text-on-surface group-hover:text-primary transition-colors">"{item.keyword}"</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-label-md uppercase tracking-wide ${idx === 0 ? 'bg-error/10 text-error border-error/20' : 'bg-tertiary-container/10 text-tertiary-container border-tertiary-container/20'}`}>
                            {item.status === 'processing' ? 'İşleniyor' : 'Bekliyor'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] text-on-surface-variant">
                          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">schedule</span> Kuyrukta</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteAutopilotKeyword(item.id); }}
                            className="text-error hover:text-error/80 ml-2"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="mt-4 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      className="form-input flex-1 py-2 px-3 text-sm rounded-lg border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary" 
                      placeholder="Yeni kelime ekle..." 
                      value={newAutopilotKeyword}
                      onChange={(e) => setNewAutopilotKeyword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addAutopilotKeyword();
                      }}
                    />
                    <button 
                      onClick={addAutopilotKeyword}
                      disabled={!newAutopilotKeyword.trim()}
                      className="bg-secondary hover:bg-secondary/90 text-white p-2 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                  </div>
                  
                  {autopilotKeywords.length > 0 && (
                    <button 
                      className="w-full py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-label-md hover:bg-primary/20 transition-colors text-center font-label-md flex justify-center items-center gap-2"
                      onClick={triggerAutopilotQueue}
                      disabled={isProcessingQueue}
                    >
                      {isProcessingQueue ? (
                        <><span className="material-symbols-outlined animate-spin text-[16px]">refresh</span> Processing...</>
                      ) : (
                        <><span className="material-symbols-outlined text-[16px]">bolt</span> Tümünü Çalıştır</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

"""
    
    with open('src/app/page.tsx', 'w') as f:
        f.write(before + new_ui + after)
        
    print("SUCCESS")
else:
    print("FAILED TO FIND TARGETS")

