        let gameState = {}; // Objekt zur Speicherung des aktuellen Spielzustands
        let numberOfGroups = 3; // Standardwert
        let lastPeriodStateIndex = -1; // Index des letzten Zustands in der History für "Zurück" Button
        let notificationTimeout; // Timeout-Variable für die Benachrichtigungen
        let periodTaskTimerInterval; // Variable für das Timer-Intervall
        let isGameSavedSinceLastChange = true; // Flag für ungespeicherte Änderungen

        // Funktion zur kaufmännischen Formatierung von Währungsbeträgen
        function formatCurrency(amount) {
            const number = parseFloat(amount);
            if (isNaN(number)) {
                return 'N/A';
            }
            return number.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
        }

        const parameterPresets = {
            easy: {
                startingCapital: 35000.00, marketAnalysisCost: 300.00, negativeCashInterestRate: 0.08,
                initialMarketSaturationFactor: 0.85, priceElasticityFactor: 0.4, demandReferencePrice: 22.00,
                minPriceElasticityDemandMultiplier: 0.30, inventoryCostPerUnit: 5.00, rndBenefitThreshold: 2500.00,
                rndVariableCostReduction: 0.15, machineDegradationRate: 0.00, isRndEnabled: false,
                timerDurationMinutes: 8, areTooltipsEnabled: true, marketingEffectivenessFactor: 0.04,
                machines: {
                    'SmartMini-Fertiger': { cost: 5000.00, capacity: 100, variableCostPerUnit: 6.00 },
                    'KompaktPro-Produzent': { cost: 12000.00, capacity: 250, variableCostPerUnit: 5.00 },
                    'FlexiTech-Assembler': { cost: 18000.00, capacity: 350, variableCostPerUnit: 4.50 },
                    'MegaFlow-Manufaktur': { cost: 25000.00, capacity: 500, variableCostPerUnit: 4.00 }
                }
            },
            medium: {
                startingCapital: 30000.00, marketAnalysisCost: 400.00, negativeCashInterestRate: 0.10,
                initialMarketSaturationFactor: 0.75, priceElasticityFactor: 0.6, demandReferencePrice: 20.00,
                minPriceElasticityDemandMultiplier: 0.20, inventoryCostPerUnit: 7.00, rndBenefitThreshold: 3000.00,
                rndVariableCostReduction: 0.12, machineDegradationRate: 0.00, isRndEnabled: true,
                timerDurationMinutes: 8, areTooltipsEnabled: true, marketingEffectivenessFactor: 0.03,
                 machines: {
                    'SmartMini-Fertiger': { cost: 5000.00, capacity: 100, variableCostPerUnit: 6.00 },
                    'KompaktPro-Produzent': { cost: 12000.00, capacity: 250, variableCostPerUnit: 5.00 },
                    'FlexiTech-Assembler': { cost: 18000.00, capacity: 350, variableCostPerUnit: 4.50 },
                    'MegaFlow-Manufaktur': { cost: 25000.00, capacity: 500, variableCostPerUnit: 4.00 }
                }
            },
            hard: {
                startingCapital: 25000.00, marketAnalysisCost: 500.00, negativeCashInterestRate: 0.12,
                initialMarketSaturationFactor: 0.65, priceElasticityFactor: 0.8, demandReferencePrice: 18.00,
                minPriceElasticityDemandMultiplier: 0.10, inventoryCostPerUnit: 9.00, rndBenefitThreshold: 3500.00,
                rndVariableCostReduction: 0.10, machineDegradationRate: 0.01, isRndEnabled: true,
                timerDurationMinutes: 8, areTooltipsEnabled: true, marketingEffectivenessFactor: 0.02,
                 machines: {
                    'SmartMini-Fertiger': { cost: 5000.00, capacity: 100, variableCostPerUnit: 6.00 },
                    'KompaktPro-Produzent': { cost: 12000.00, capacity: 250, variableCostPerUnit: 5.00 },
                    'FlexiTech-Assembler': { cost: 18000.00, capacity: 350, variableCostPerUnit: 4.50 },
                    'MegaFlow-Manufaktur': { cost: 25000.00, capacity: 500, variableCostPerUnit: 4.00 }
                }
            }
        };

        // Feste Spielparameter (können in den Einstellungen geändert werden)
        // Standardmäßig mit "Einfacher Markt" initialisieren
        let FIXED_PARAMETERS = JSON.parse(JSON.stringify(parameterPresets.easy));
        let DEFAULT_PARAMETERS = JSON.parse(JSON.stringify(FIXED_PARAMETERS));


        let tooltips = {
            'production': { title: 'Produktionsmenge', text: 'Geben Sie die Anzahl der Einheiten ein, die Ihre Gruppe in dieser Periode produzieren möchte. Die Produktion ist durch Ihre aktuelle Maschinenkapazität begrenzt. Diese Menge wird zusammen mit ggf. Einheiten aus dem Lager in dieser Periode am Markt angeboten.' },
            'sell-from-inventory': { title: 'Verkaufen aus Lagerbestand', text: 'Geben Sie die Anzahl der Einheiten ein, die Ihre Gruppe aus dem aktuellen Lagerbestand zusätzlich zur Produktion auf dem Markt anbieten möchte. Kann nicht höher sein als der aktuelle Lagerbestand.' },
            'price': { title: 'Verkaufspreis pro Einheit', text: 'Legen Sie den Preis pro Einheit fest, zu dem Ihre Gruppe ihre Produkte auf dem Markt anbieten möchte. Ein niedrigerer Preis kann die Nachfrage erhöhen, aber Ihren Gewinn pro Einheit reduzieren.' },
            'marketing': { title: 'Marketing Bemühung (Periode 5)', text: 'Nur in Periode 5: Geben Sie Ihre Marketing Bemühung auf einer Skala von 1 (sehr gering) bis 10 (sehr hoch) ein. Ihre Spielleitung bewertet dies. Eine höhere individuelle Marketing Bemühung kann Ihren Absatzanteil bei gleichem Preisniveau erhöhen.' },
            'market-analysis': { title: 'Marktanalyse kaufen', text: `Aktivieren Sie diese Option, um eine Marktanalyse für ${formatCurrency(FIXED_PARAMETERS.marketAnalysisCost)} zu kaufen. Die Analyse liefert Ihnen detaillierte Infos über Konkurrenz und Markt der letzten Periode.` },
            'rnd-investment': { title: 'Forschung & Entwicklung investieren', text: `Ab Periode 3: Geben Sie einen Betrag ein, den Ihre Gruppe in F&E investieren möchte. Kumulierte Investitionen von ${formatCurrency(FIXED_PARAMETERS.rndBenefitThreshold)} führen zu einer permanenten Reduzierung der variablen Produktionskosten um ${(FIXED_PARAMETERS.rndVariableCostReduction * 100).toFixed(1)}%. (Nur wenn F&E in den Einstellungen aktiviert ist)` },
            'buy-machine': { title: 'Zusätzliche Maschine kaufen', text: `Ab Periode 3 und danach alle 3 Perioden (Periode 6, 9, ...): Wählen Sie hier eine zusätzliche Produktionsmaschine aus, falls Sie über ausreichend Kapital verfügen. Eine neue Maschine erhöht Ihre Produktionskapazität.` },
            'startingCapital': { title: 'Startkapital pro Gruppe', text: 'Das anfängliche Kapital, mit dem jede Gruppe das Spiel beginnt.' },
            'marketAnalysisCost': { title: 'Kosten Marktanalyse', text: 'Die Kosten für den Kauf der Marktanalyse pro Periode.' },
            'negativeCashInterestRate': { title: 'Zinssatz Negativsaldo', text: 'Der Zinssatz, der auf negative Kontostände am Ende jeder Periode angewendet wird (z.B. 0.10 für 10%).' },
            'initialMarketSaturationFactor': { title: 'Initialer Marktsättigungsfaktor', text: `Bestimmt, welcher Anteil der gesamten initialen Produktionskapazität aller Gruppen als anfängliche Marktnachfrage (bei Referenzpreis) dient (z.B. ${FIXED_PARAMETERS.initialMarketSaturationFactor} für ${(FIXED_PARAMETERS.initialMarketSaturationFactor * 100).toFixed(0)}%).` },
            'priceElasticityFactor': { title: 'Preiselastizitätsfaktor', text: 'Bestimmt, wie stark die Marktnachfrage auf Preisänderungen reagiert. Ein höherer Wert bedeutet, dass die Nachfrage empfindlicher auf Preisänderungen ist.' },
            'demandReferencePrice': { title: 'Nachfrage Referenzpreis', text: 'Der Preis, bei dem die Marktnachfrage der initialen Basisnachfrage entspricht (bevor andere Faktoren wie Marketing berücksichtigt werden).' },
            'minPriceElasticityDemandMultiplier': { title: 'Min. Nachfragemultiplikator (Preiselastizität)', text: `Verhindert, dass die Nachfrage aufgrund hoher Durchschnittspreise unter diesen Multiplikator der Basisnachfrage fällt (z.B. ${(FIXED_PARAMETERS.minPriceElasticityDemandMultiplier * 100).toFixed(0)}% für ${(FIXED_PARAMETERS.minPriceElasticityDemandMultiplier * 100).toFixed(0)}%). Beeinflusst die Nachfrage *vor* Marketing.`},
            'inventoryCostPerUnit': { title: 'Lagerkosten pro Einheit', text: `Die Kosten pro Einheit (${formatCurrency(FIXED_PARAMETERS.inventoryCostPerUnit)}), die am Ende jeder Periode für im Lager befindliche Produkte anfallen.` },
            'rndBenefitThreshold': { title: 'F&E Vorteil Schwelle', text: 'Der kumulierte F&E-Investitionsbetrag, der erreicht werden muss, um den F&E-Vorteil freizuschalten.' },
            'rndVariableCostReduction': { title: 'F&E Variable Kosten Reduzierung', text: 'Die prozentuale Reduzierung der variablen Produktionskosten pro Einheit, nachdem der F&E-Vorteil freigeschaltet wurde (z.B. 0.12 für 12%).' },
            'machineDegradationRate': { title: 'Maschinen Kapazitätsverlust Rate', text: 'Der Prozentsatz der anfänglichen Kapazität, den jede Maschine pro Periode verliert (z.B. 0.00 für 0%).' },
            'isRndEnabled': { title: 'F&E aktivieren/deaktivieren', text: 'Ermöglicht oder verhindert Investitionen in Forschung & Entwicklung und deren Vorteile.'},
            'timerDurationMinutes': { title: 'Timer-Dauer für Arbeitsauftrag (Minuten)', text: 'Legt die Standarddauer des Timers im "Arbeitsauftrag für Periode X"-Fenster fest.'},
            'areTooltipsEnabled': { title: 'Tooltips anzeigen', text: 'Blendet die Info-Boxen ein oder aus, die erscheinen, wenn man über Eingabefelder fährt.'},
            'marketingEffectivenessFactor': { title: 'Marketing-Effektivitätsfaktor', text: `Bestimmt, wie stark sich die individuelle Marketing-Bewertung (Periode 5) auf den Absatzanteil auswirkt (z.B. ${(FIXED_PARAMETERS.marketingEffectivenessFactor * 100).toFixed(0)}% Bonus pro Punkt über 5).`},
            // 'showTutorialOnLoad': { title: 'Tutorial beim Start anzeigen', text: 'Zeigt das Einführungs-Tutorial automatisch beim Laden der Seite an.'} // Entfernt
        };


        // Funktion zum Anzeigen der Info Box
        function showInfo(key) {
            if (!FIXED_PARAMETERS.areTooltipsEnabled) { // Prüfen, ob Tooltips aktiviert sind
                hideInfo(); // Sicherstellen, dass keine alten Tooltips angezeigt werden
                return;
            }
            const infoBox = document.getElementById('info-box');
            const infoTitle = document.getElementById('info-box-title');
            const infoContent = document.getElementById('info-box-content');

            if (tooltips[key]) {
                infoTitle.innerText = tooltips[key].title;
                // Dynamische Aktualisierung für Tooltips, die Parameterwerte enthalten
                let text = tooltips[key].text;
                if (key === 'market-analysis') {
                    text = `Aktivieren Sie diese Option, um eine Marktanalyse für ${formatCurrency(FIXED_PARAMETERS.marketAnalysisCost)} zu kaufen. Die Analyse liefert Ihnen detaillierte Infos über Konkurrenz und Markt der letzten Periode.`;
                } else if (key === 'rnd-investment') {
                    text = `Ab Periode 3: Geben Sie einen Betrag ein, den Ihre Gruppe in F&E investieren möchte. Kumulierte Investitionen von ${formatCurrency(FIXED_PARAMETERS.rndBenefitThreshold)} führen zu einer permanenten Reduzierung der variablen Produktionskosten um ${(FIXED_PARAMETERS.rndVariableCostReduction * 100).toFixed(1)}%. ${FIXED_PARAMETERS.isRndEnabled ? '' : '(F&E ist aktuell in den Einstellungen deaktiviert.)'}`;
                } else if (key === 'initialMarketSaturationFactor') {
                    text = `Bestimmt, welcher Anteil der gesamten initialen Produktionskapazität aller Gruppen als anfängliche Marktnachfrage (bei Referenzpreis) dient (z.B. ${FIXED_PARAMETERS.initialMarketSaturationFactor} für ${(FIXED_PARAMETERS.initialMarketSaturationFactor * 100).toFixed(0)}%).`;
                } else if (key === 'minPriceElasticityDemandMultiplier') {
                    text = `Verhindert, dass die Nachfrage aufgrund hoher Durchschnittspreise unter diesen Multiplikator der Basisnachfrage fällt (z.B. ${FIXED_PARAMETERS.minPriceElasticityDemandMultiplier} für ${(FIXED_PARAMETERS.minPriceElasticityDemandMultiplier * 100).toFixed(0)}%). Beeinflusst die Nachfrage *vor* Marketing.`;
                }
                infoContent.innerText = text;
                infoBox.classList.remove('hidden-start');
                infoBox.classList.add('show');
                infoBox.style.display = 'block';
            } else {
                hideInfo();
            }
        }

        // Funktion zum Verstecken der Info Box
        function hideInfo() {
            const infoBox = document.getElementById('info-box');
            infoBox.classList.remove('show');
            infoBox.classList.add('hidden-start');
            // Wait for animation to complete before setting display to none
            setTimeout(() => {
                if (!infoBox.classList.contains('show')) {
                     infoBox.style.display = 'none';
                }
            }, 300); // Match transition duration
        }

        // Funktion zum Anzeigen einer Benachrichtigung
        function showNotification(message, type = 'error', duration = 5000) {
            const notificationArea = document.getElementById('notification-area');
            const notificationMessage = document.getElementById('notification-message');

            clearTimeout(notificationTimeout);

            notificationMessage.textContent = message;

            // Ensure proper class reset and re-application for transition
            notificationArea.classList.remove('show', 'success', 'error');
            notificationArea.classList.add('hidden-start'); // Start from the "hidden" state for transition

            // Force a reflow to ensure the browser registers the class changes before adding 'show'
            requestAnimationFrame(() => {
                requestAnimationFrame(() => { // Double requestAnimationFrame for even more robustness in some browsers
                    notificationArea.classList.remove('hidden-start');
                    notificationArea.classList.add('show');
                    if (type === 'success') {
                        notificationArea.classList.add('success');
                    } else {
                        notificationArea.classList.add('error');
                    }
                });
            });

            notificationTimeout = setTimeout(hideNotification, duration);
        }

        // Funktion zum Verstecken der Benachrichtigung
        function hideNotification() {
            const notificationArea = document.getElementById('notification-area');
            notificationArea.classList.remove('show');
            notificationArea.classList.add('hidden-start');
             setTimeout(() => {
                if (!notificationArea.classList.contains('show')) {
                    notificationArea.style.display = 'none';
                }
            }, 300); // Match transition duration
        }


        // Funktion zum Erstellen der Gruppenwahl-Dropdown
        function setupGroupSelectionDropdown() {
            const selectElement = document.getElementById('num-groups-select');
            selectElement.innerHTML = '';
            for (let i = 2; i <= 10; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.innerText = i;
                if (i === numberOfGroups) {
                    option.selected = true;
                }
                selectElement.appendChild(option);
            }
            setupGroupNameInputs();
        }

        function selectNumberOfGroups(num) {
            numberOfGroups = parseInt(num);
            setupGroupNameInputs();
        }

        function setupGroupNameInputs() {
            const groupNameInputsDiv = document.getElementById('group-name-inputs');
            groupNameInputsDiv.innerHTML = '';
            for (let i = 0; i < numberOfGroups; i++) {
                const formGroupDiv = document.createElement('div');
                formGroupDiv.classList.add('form-group');
                formGroupDiv.innerHTML = `
                    <label for="group-name-${i + 1}">Name Gruppe ${i + 1}:</label>
                    <input type="text" id="group-name-${i + 1}" value="Gruppe ${i + 1}">
                `;
                groupNameInputsDiv.appendChild(formGroupDiv);
            }
        }

        function generateAndPrintStudentTemplates() {
            const groupNames = [];
            for (let i = 0; i < numberOfGroups; i++) {
                const groupNameInput = document.getElementById(`group-name-${i + 1}`);
                const groupName = groupNameInput ? groupNameInput.value.trim() : `Gruppe ${i + 1}`;
                groupNames.push(groupName);
            }

            if (groupNames.some(name => name === "")) {
                showNotification("Bitte geben Sie für alle Gruppen einen Namen ein, bevor Sie die Vorlagen drucken.");
                return;
            }

            let templateContent = `
                <!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Planspiel: Entscheidungen & Ergebnisse</title>
                <style>
                    body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #333; margin: 20px; }
                    h1 { color: #1a56db; border-bottom: 2px solid #e0e7ff; padding-bottom: 10px; margin-bottom: 20px; }
                    h2 { color: #3b82f6; margin-top: 20px; margin-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; border: 1px solid #d1d5db; font-size: 0.75em; } /* Schriftgröße angepasst */
                    th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; min-width: 70px; } /* Padding erhöht für größere Zeilen */
                    th:first-child, td:first-child { min-width: 40px; }
                    th { background-color: #eef2ff; font-weight: bold; }
                    td { background-color: #ffffff; }
                    tr:nth-child(even) td { background-color: #f9fafb; }
                    .notes { margin-top: 15px; font-size: 0.75em; color: #555; } /* Schriftgröße angepasst */
                    .notes strong { color: #1a56db; }
                    .page-break { page-break-before: always !important; height:0; display:block; } /* Ensure page break works */
                    .no-input { background-color: #cccccc !important; color: #555 !important; } /* Deutlicher ausgegraut */
                    .machine-selection-print { margin-bottom: 15px; border: 1px solid #d1d5db; padding: 10px; border-radius: 5px; background-color: #f9fafb; }
                    .machine-selection-print label { margin-right: 15px; }
                    @media print {
                        body { margin: 0; padding: 0; }
                        h1 { border-bottom: 1px solid #ccc; font-size: 1.1em; margin-bottom: 8px; padding-bottom: 4px; }
                        h2 { margin-top: 12px; margin-bottom: 4px; font-size: 0.9em; }
                        table, th, td { border-color: #ccc !important; }
                        tr:nth-child(even) td { background-color: #f2f2f2 !important; }
                        table { font-size: 0.6em; } th, td { padding: 6px; } /* Padding für Druck angepasst */
                        .no-input { background-color: #cccccc !important; color: #555 !important; }
                        .notes { font-size: 0.65em; margin-top: 8px; }
                        .machine-selection-print { border: 1px solid #ccc !important; background-color: #f2f2f2 !important; padding: 5px; margin-bottom: 10px; }
                    }
                </style></head><body>`;

            groupNames.forEach((name, index) => {
                if (index > 0) templateContent += '<div class="page-break"></div>';
                templateContent += `
                    <h1>Markt-Match 5 – Entscheidungs- und Ergebnisvorlage</h1><h2>Gruppe: ${name}</h2>
                    <p><strong>Wichtig:</strong> Ihre produzierten Einheiten können in derselben Periode sofort am Markt angeboten werden!</p>
                    <p>Tragen Sie hier Ihre Entscheidungen für jede Periode *vor* der Simulation ein und notieren Sie anschließend Ihre Ergebnisse.</p>
                    <div class="machine-selection-print"><strong>Maschinenauswahl (Vor Periode 1):</strong>
                        <label><input type="checkbox"> SmartMini-Fertiger</label> <label><input type="checkbox"> KompaktPro-Produzent</label> <label><input type="checkbox"> FlexiTech-Assembler</label> <label><input type="checkbox"> MegaFlow-Manufaktur</label>
                    </div>
                    <table><thead><tr><th>Periode</th><th>Produktion Stückzahl</th><th>Aus Lager verkaufen</th><th>Verkaufspreis (€)</th><th>Marktanalyse kaufen (Ja/Nein)</th>
                    ${FIXED_PARAMETERS.isRndEnabled ? '<th>F&E Investition (€)</th>' : ''}
                    <th>Zusätzliche Maschine kaufen? Ja/nein</th></tr></thead><tbody>
                    ${Array.from({ length: 20 }, (_, i) => i + 1).map(period => {
                        const isRndPeriod = period >= 3 && FIXED_PARAMETERS.isRndEnabled;
                        const isMachinePeriod = period >= 3 && (period - 3) % 3 === 0;
                        let rndCell = '';
                        if (FIXED_PARAMETERS.isRndEnabled) {
                            rndCell = `<td class="${isRndPeriod ? '' : 'no-input'}">${isRndPeriod ? '' : '---'}</td>`;
                        }
                        const sellFromInventoryClass = period === 1 ? 'no-input' : '';
                        const sellFromInventoryContent = period === 1 ? '---' : '';

                        return `<tr><td>${period}</td><td></td><td class="${sellFromInventoryClass}">${sellFromInventoryContent}</td><td></td><td></td>${rndCell}<td class="${isMachinePeriod ? '' : 'no-input'}">${isMachinePeriod ? '' : '---'}</td></tr>`;
                    }).join('')}
                    </tbody></table>
                    <div class="notes"><p><strong>Hinweise:</strong></p><ul>
                        ${FIXED_PARAMETERS.isRndEnabled ? `<li><strong>Ab Periode 3:</strong> Investitionen in F&E möglich. Kumulierte Investition von ${formatCurrency(FIXED_PARAMETERS.rndBenefitThreshold)} reduziert variable Produktionskosten permanent um ${(FIXED_PARAMETERS.rndVariableCostReduction * 100).toFixed(1)}%.</li>` : ''}
                        <li><strong>Maschinenkauf:</strong> Zusätzliche Maschinen können ab Periode 3 und danach alle 3 Perioden (Periode 6, 9, 12, 15, 18) gekauft werden.</li>
                        <li>Zellen mit "---" sind für diese Periode nicht relevant für Entscheidungen.</li>
                    </ul></div>`;
            });
            templateContent += `</body></html>`;

            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.open();
                printWindow.document.write(templateContent);
                printWindow.document.close();
                printWindow.print();
            } else {
                showNotification("Das Druckfenster konnte nicht geöffnet werden. Bitte erlauben Sie Pop-ups für diese Seite.");
            }
        }


        function startGame() {
            if (numberOfGroups < 2 || numberOfGroups > 10) {
                showNotification("Bitte wählen Sie eine gültige Anzahl von Gruppen zwischen 2 und 10.");
                return;
            }
             ensureValidFixedParameters("startGame");


            gameState = {
                period: 0,
                groups: [],
                parameters: FIXED_PARAMETERS,
                initialBaseDemand: 0,
                history: { periods: [], groupCapital: {}, marketSummary: [], states: [], groupData: {} } // groupData hinzugefügt
            };

            for (let i = 0; i < numberOfGroups; i++) {
                const groupNameInput = document.getElementById(`group-name-${i + 1}`);
                const groupName = groupNameInput ? groupNameInput.value.trim() : `Gruppe ${i + 1}`;
                if (groupName === "") {
                    showNotification(`Bitte geben Sie einen Namen für Gruppe ${i + 1} ein.`);
                    return;
                }
                gameState.groups.push({
                    id: i + 1, name: groupName, initialCapacity: 0, capital: gameState.parameters.startingCapital,
                    machines: [], inventory: 0, cumulativeRndInvestment: 0, rndBenefitApplied: false,
                    decisions: {}, results: {}, marketAnalysisBought: false, oneTimeMarketing: 0,
                    cumulativeProfit: 0.00 // Neu hinzugefügt
                });
                gameState.history.groupCapital[groupName] = [gameState.parameters.startingCapital];
                gameState.history.groupData[groupName] = { periods: [] }; // Initialisiere groupData für Diagramme
            }
            isGameSavedSinceLastChange = false;
            saveStateToHistory();
            document.getElementById('initial-setup').classList.add('hidden');
            document.getElementById('game-in-progress').classList.remove('hidden');
            document.getElementById('current-period').innerText = gameState.period;
            setupMachineSelection();
        }

        function saveStateToHistory() {
            const groupsCopy = JSON.parse(JSON.stringify(gameState.groups));
            gameState.history.states.push({
                period: gameState.period,
                groups: groupsCopy,
                marketSummary: gameState.lastPeriodMarketSummary ? JSON.parse(JSON.stringify(gameState.lastPeriodMarketSummary)) : null,
                initialBaseDemand: gameState.initialBaseDemand
            });
            gameState.groups.forEach(group => {
                if (!gameState.history.groupCapital[group.name]) {
                    gameState.history.groupCapital[group.name] = [];
                }
                if (gameState.history.groupCapital[group.name].length <= gameState.period) {
                     gameState.history.groupCapital[group.name].push(group.capital);
                } else {
                    gameState.history.groupCapital[group.name][gameState.period] = group.capital;
                }

                // Speichern von Daten für Diagramme (ENTFERNT)
            });
             if (gameState.history.periods.length <= gameState.period || gameState.history.periods[gameState.history.periods.length -1] !== gameState.period ) {
                gameState.history.periods.push(gameState.period);
            }
            lastPeriodStateIndex = gameState.history.states.length - 1;
        }

        function setupMachineSelection() {
            ensureValidFixedParameters("setupMachineSelection");
            setTimeout(() => { // Defer execution slightly
                const periodDecisions = document.getElementById('period-decisions');
                if (periodDecisions) periodDecisions.classList.add('hidden');

                const periodResults = document.getElementById('period-results');
                if (periodResults) periodResults.classList.add('hidden');

                const nextPeriodButton = document.getElementById('show-next-period-task-button');
                if (nextPeriodButton) nextPeriodButton.classList.add('hidden');

                const groupResultsButton = document.getElementById('show-group-results-button');
                if (groupResultsButton) groupResultsButton.classList.add('hidden');

                // const printTemplateButton = document.getElementById('print-student-template-button'); // Entfernt, da jetzt im Begleitmaterial
                // if (printTemplateButton) printTemplateButton.classList.remove('hidden');

                const supportingMaterialBtnIngame = document.getElementById('supporting-material-button-ingame');
                if (supportingMaterialBtnIngame) supportingMaterialBtnIngame.classList.add('hidden'); // Hide in period 0

                const machineSelectionDiv = document.getElementById('machine-selection');
                if (machineSelectionDiv) machineSelectionDiv.classList.remove('hidden');

                const selectionDiv = document.getElementById('machine-selection-groups');
                if (selectionDiv) {
                    selectionDiv.innerHTML = '';
                    gameState.groups.forEach(group => {
                        const groupDiv = document.createElement('div');
                        groupDiv.classList.add('group-decisions', 'mb-4');
                        groupDiv.innerHTML = `
                            <h4 class="font-semibold">${group.name} - Budget: ${formatCurrency(group.capital)}</h4>
                            <div class="form-group">
                                <label for="machine-select-${group.id}">Maschine auswählen:</label>
                                <select id="machine-select-${group.id}">
                                    <option value="">-- Bitte auswählen --</option>
                                    ${Object.keys(FIXED_PARAMETERS.machines).map(machineName => {
                                        const machine = FIXED_PARAMETERS.machines[machineName];
                                        if (group.capital >= machine.cost) {
                                            return `<option value="${machineName}">${machineName} (${formatCurrency(machine.cost)}, Kapazität ${machine.capacity}, Variable Kosten: ${formatCurrency(machine.variableCostPerUnit)}/Einheit)</option>`;
                                        }
                                        return '';
                                    }).join('')}
                                </select>
                            </div>`;
                        selectionDiv.appendChild(groupDiv);
                    });
                    selectionDiv.querySelectorAll('select').forEach(select => {
                        select.addEventListener('focus', () => showInfo('buy-machine'));
                        select.addEventListener('blur', hideInfo);
                    });
                }
            }, 0);
        }

        function processMachineSelection() {
            let allGroupsSelected = true;
            let totalInitialCapacityOfAllGroups = 0;

            for (const group of gameState.groups) {
                const selectElement = document.getElementById(`machine-select-${group.id}`);
                const selectedMachineName = selectElement.value;

                if (!selectedMachineName) {
                    allGroupsSelected = false;
                    showNotification(`Gruppe ${group.name}: Bitte wählen Sie eine Maschine aus.`);
                    return;
                }

                const selectedMachine = FIXED_PARAMETERS.machines[selectedMachineName];
                if (selectedMachine) {
                    group.machines = [{
                        name: selectedMachineName,
                        cost: selectedMachine.cost,
                        capacity: selectedMachine.capacity,
                        variableCostPerUnit: selectedMachine.variableCostPerUnit
                    }];
                    group.capital -= selectedMachine.cost;
                    totalInitialCapacityOfAllGroups += selectedMachine.capacity;
                } else {
                    showNotification(`Fehler: Ausgewählte Maschine '${selectedMachineName}' nicht gefunden.`);
                    allGroupsSelected = false;
                    return;
                }
            }

            if (!allGroupsSelected) return;

            gameState.initialBaseDemand = Math.floor(totalInitialCapacityOfAllGroups * FIXED_PARAMETERS.initialMarketSaturationFactor);
            console.log(`Total Initial Capacity: ${totalInitialCapacityOfAllGroups}, Initial Market Saturation Factor: ${FIXED_PARAMETERS.initialMarketSaturationFactor}, Calculated Initial Base Demand: ${gameState.initialBaseDemand}`);

            gameState.period = 1;
            document.getElementById('current-period').innerText = gameState.period;
            document.getElementById('machine-selection').classList.add('hidden');
            document.getElementById('period-decisions').classList.remove('hidden');
            isGameSavedSinceLastChange = false;
            saveStateToHistory();
            autoSaveGame();
            setupPeriodInputs();
        }


        function setupPeriodInputs() {
            ensureValidFixedParameters("setupPeriodInputs");
            const inputsDiv = document.getElementById('group-decision-inputs');
            inputsDiv.innerHTML = '';

            const rndMachineInfoDiv = document.getElementById('rnd-machine-info');
            const infoPeriodNumberSpan = document.getElementById('info-period-number');
            const rndThresholdInfoSpan = document.getElementById('rnd-threshold-info');
            const rndReductionInfoSpan = document.getElementById('rnd-reduction-info');

            const supportingMaterialBtnIngame = document.getElementById('supporting-material-button-ingame');
            if (supportingMaterialBtnIngame) supportingMaterialBtnIngame.classList.remove('hidden'); // Show for period > 0


            if (FIXED_PARAMETERS.isRndEnabled && gameState.period >= 3) { // Check if R&D is enabled
                rndMachineInfoDiv.classList.remove('hidden');
                infoPeriodNumberSpan.innerText = gameState.period;
                rndThresholdInfoSpan.innerText = formatCurrency(FIXED_PARAMETERS.rndBenefitThreshold);
                rndReductionInfoSpan.innerText = `${(FIXED_PARAMETERS.rndVariableCostReduction * 100).toFixed(1)}%`;
            } else {
                rndMachineInfoDiv.classList.add('hidden');
            }

            gameState.groups.forEach(group => {
                let currentTotalCapacity = group.machines.reduce((sum, machine) => {
                    const effectiveCapacity = machine.capacity * Math.max(0, 1 - FIXED_PARAMETERS.machineDegradationRate * (gameState.period - 1));
                    return sum + effectiveCapacity;
                }, 0);
                let roundedTotalCapacity = Math.floor(currentTotalCapacity);

                const groupDiv = document.createElement('div');
                groupDiv.classList.add('group-decisions', 'mb-4');
                let rndInvestmentHTML = '';
                if (FIXED_PARAMETERS.isRndEnabled && gameState.period >= 3) {
                    rndInvestmentHTML = `
                    <div class="form-group">
                        <label for="rnd-investment-${group.id}">Forschung & Entwicklung investieren (€):</label>
                        <input type="number" id="rnd-investment-${group.id}" min="0" value="0.00" step="0.01">
                    </div>`;
                }

                let buyMachineHTML = '';
                if (gameState.period >= 3 && (gameState.period - 3) % 3 === 0) {
                    buyMachineHTML = `
                    <div class="form-group">
                        <label for="buy-machine-${group.id}">Zusätzliche Maschine kaufen?</label>
                        <select id="buy-machine-${group.id}" data-group-id="${group.id}">
                            <option value="">Keine</option>
                            ${Object.keys(FIXED_PARAMETERS.machines).map(machineName => {
                                const machine = FIXED_PARAMETERS.machines[machineName];
                                if (group.capital >= machine.cost) { // Check if group can afford
                                    return `<option value="${machineName}" data-capacity="${machine.capacity}" data-cost="${machine.cost}">${machineName} (${formatCurrency(machine.cost)}, Kapazität ${machine.capacity}, Variable Kosten: ${formatCurrency(machine.variableCostPerUnit)}/Einheit)</option>`;
                                }
                                return '';
                            }).join('')}
                        </select>
                    </div>`;
                }


                groupDiv.innerHTML = `
                    <h3 class="font-semibold text-lg">${group.name}</h3>
                    <p>Aktuelles Kapital: ${formatCurrency(group.capital)}</p>
                    <p>Kumulierter Gewinn: ${formatCurrency(group.cumulativeProfit)}</p>
                    <p>Besessene Maschinen: <span id="machine-list-${group.id}">${group.machines.map(m => `${m.name} (Kapazität: ${m.capacity} -> ${Math.floor(m.capacity * Math.max(0, 1 - FIXED_PARAMETERS.machineDegradationRate * (gameState.period - 1)))} Einheiten/Periode, Var. Kosten: ${formatCurrency(m.variableCostPerUnit)}/Einheit)`).join(', ') || 'Keine'}</span></p>
                    <p>Gesamtproduktionskapazität (effektiv): <span id="capacity-display-${group.id}">${roundedTotalCapacity}</span> Einheiten</p>
                    <p>Aktueller Lagerbestand: ${Math.floor(group.inventory)} Einheiten</p>
                    ${FIXED_PARAMETERS.isRndEnabled ? `<p>Kumulierte F&E Investition: ${formatCurrency(group.cumulativeRndInvestment)} ${group.rndBenefitApplied ? '(Vorteil angewendet)' : ''}</p>` : ''}
                    <div class="form-group">
                        <label for="production-${group.id}">Produktionsmenge (max <span id="production-max-${group.id}">${roundedTotalCapacity}</span>):</label>
                        <input type="number" id="production-${group.id}" min="0" max="${roundedTotalCapacity}" value="0">
                        <span class="input-hint">Hinweis: Die hier produzierte Menge wird vollständig in dieser Periode am Markt angeboten (zusammen mit ggf. ausgewähltem Verkauf aus Lagerbestand).</span>
                    </div>
                    <div class="form-group">
                        <label for="sell-from-inventory-${group.id}">Verkaufen aus Lagerbestand (max ${Math.floor(group.inventory)}):</label>
                        <input type="number" id="sell-from-inventory-${group.id}" min="0" max="${Math.floor(group.inventory)}" value="0">
                    </div>
                    <div class="form-group">
                        <label for="price-${group.id}">Verkaufspreis pro Einheit (€):</label>
                        <input type="number" id="price-${group.id}" min="0" value="0.00" step="0.01">
                    </div>
                    ${gameState.period === 5 ? `
                    <div class="form-group">
                        <label for="marketing-${group.id}">Marketing Bemühung (1-10, einmalig in Periode 5):</label>
                        <input type="number" id="marketing-${group.id}" min="1" max="10" value="5">
                    </div>` : ''}
                    <div class="form-group">
                        <label for="market-analysis-${group.id}">Marktanalyse kaufen (${formatCurrency(FIXED_PARAMETERS.marketAnalysisCost)}):</label>
                        <input type="checkbox" id="market-analysis-${group.id}">
                    </div>
                    ${rndInvestmentHTML}
                    ${buyMachineHTML}`;
                inputsDiv.appendChild(groupDiv);

                // Event Listener für Maschinenauswahl, um Kapazität dynamisch zu aktualisieren
                const buyMachineSelect = document.getElementById(`buy-machine-${group.id}`);
                if (buyMachineSelect) {
                    buyMachineSelect.addEventListener('change', function() {
                        const groupId = parseInt(this.dataset.groupId);
                        const selectedOption = this.options[this.selectedIndex];
                        const additionalCapacity = selectedOption.value ? parseInt(selectedOption.dataset.capacity) : 0;

                        let baseCapacity = 0;
                        const currentGroup = gameState.groups.find(g => g.id === groupId);
                        if (currentGroup) {
                             baseCapacity = currentGroup.machines.reduce((sum, machine) => {
                                const effectiveCapacity = machine.capacity * Math.max(0, 1 - FIXED_PARAMETERS.machineDegradationRate * (gameState.period - 1));
                                return sum + effectiveCapacity;
                            }, 0);
                        }

                        const newTotalCapacity = Math.floor(baseCapacity + additionalCapacity);
                        document.getElementById(`capacity-display-${groupId}`).innerText = newTotalCapacity;
                        document.getElementById(`production-max-${groupId}`).innerText = newTotalCapacity;
                        document.getElementById(`production-${groupId}`).max = newTotalCapacity;
                    });
                }
            });


            inputsDiv.querySelectorAll('input[type="number"], input[type="checkbox"], select').forEach(el => {
                const key = el.id.split('-')[0]; // e.g., 'production', 'market-analysis'
                if (tooltips[key]) {
                    el.addEventListener('focus', () => showInfo(key));
                    el.addEventListener('blur', hideInfo);
                }
            });
        }


        function processPeriod() {
            let allDecisionsValid = true;
            for (const group of gameState.groups) { // Use for...of for early return
                const productionInput = document.getElementById(`production-${group.id}`);
                const sellFromInventoryInput = document.getElementById(`sell-from-inventory-${group.id}`);
                const priceInput = document.getElementById(`price-${group.id}`);
                const marketingInput = document.getElementById(`marketing-${group.id}`);
                const marketAnalysisBoughtCheckbox = document.getElementById(`market-analysis-${group.id}`);
                const rndInvestmentInput = document.getElementById(`rnd-investment-${group.id}`); // Kann null sein, wenn F&E deaktiviert
                const buyMachineSelect = document.getElementById(`buy-machine-${group.id}`);

                const production = productionInput ? parseInt(productionInput.value) : 0;
                const sellFromInventory = sellFromInventoryInput ? parseInt(sellFromInventoryInput.value) : 0;
                const price = priceInput ? parseFloat(priceInput.value) : 0.00;
                const marketing = (gameState.period === 5 && marketingInput) ? parseInt(marketingInput.value) : 5;
                const marketAnalysisBought = marketAnalysisBoughtCheckbox ? marketAnalysisBoughtCheckbox.checked : false;
                const rndInvestment = (FIXED_PARAMETERS.isRndEnabled && gameState.period >= 3 && rndInvestmentInput) ? parseFloat(rndInvestmentInput.value) : 0;


                let currentTotalCapacity = group.machines.reduce((sum, machine) => {
                    const effectiveCapacity = machine.capacity * Math.max(0, 1 - FIXED_PARAMETERS.machineDegradationRate * (gameState.period - 1));
                    return sum + effectiveCapacity;
                }, 0);

                let machineToBuy = null;
                if (gameState.period >= 3 && (gameState.period - 3) % 3 === 0 && buyMachineSelect) {
                    const selectedMachineName = buyMachineSelect.value;
                    if (selectedMachineName !== "") {
                        const machineData = FIXED_PARAMETERS.machines[selectedMachineName];
                        if (!machineData) {
                            showNotification(`Gruppe ${group.name}: Fehler: Ausgewählte Maschine '${selectedMachineName}' nicht gefunden.`);
                            allDecisionsValid = false; return;
                        } else if (group.capital < machineData.cost) { // Kapitalprüfung hier wichtig
                            showNotification(`Gruppe ${group.name}: Nicht genug Kapital für Maschine '${selectedMachineName}'. Benötigt ${formatCurrency(machineData.cost)}, hat ${formatCurrency(group.capital)}.`);
                            allDecisionsValid = false; return;
                        } else {
                            machineToBuy = { name: selectedMachineName, ...machineData };
                            currentTotalCapacity += machineData.capacity; // Kapazität für diese Periode erhöhen
                        }
                    }
                }
                const roundedTotalCapacity = Math.floor(currentTotalCapacity);


                if (isNaN(production) || production < 0 || production > roundedTotalCapacity) {
                    showNotification(`Gruppe ${group.name}: Ungültige Produktionsmenge. Muss zwischen 0 und ${roundedTotalCapacity} liegen (Kapazität inkl. ggf. neu gewählter Maschine).`);
                    allDecisionsValid = false; return;
                }
                if (isNaN(sellFromInventory) || sellFromInventory < 0 || sellFromInventory > Math.floor(group.inventory) || !Number.isInteger(sellFromInventory)) {
                    showNotification(`Gruppe ${group.name}: Ungültige Menge für Verkauf aus Lagerbestand. Muss eine ganze Zahl zwischen 0 und ${Math.floor(group.inventory)} sein.`);
                    allDecisionsValid = false; return;
                }
                if (isNaN(price) || price < 0) {
                    showNotification(`Gruppe ${group.name}: Ungültiger Preis. Muss eine positive Zahl sein.`);
                    allDecisionsValid = false; return;
                }
                if (gameState.period === 5 && (isNaN(marketing) || marketing < 1 || marketing > 10)) {
                    showNotification(`Gruppe ${group.name}: Ungültige Marketing Bemühung. Muss zwischen 1 und 10 liegen.`);
                    allDecisionsValid = false; return;
                }
                if (FIXED_PARAMETERS.isRndEnabled && gameState.period >= 3 && (isNaN(rndInvestment) || rndInvestment < 0)) {
                    showNotification(`Gruppe ${group.name}: Ungültiger F&E Investitionsbetrag. Muss eine positive Zahl sein.`);
                    allDecisionsValid = false; return;
                }


                group.decisions = { production, sellFromInventory, price, marketing, marketAnalysisBought, rndInvestment, machineToBuy };
                group.marketAnalysisBought = marketAnalysisBought; // Store this for results display
                if (gameState.period === 5) group.oneTimeMarketing = marketing;
            }

            if (!allDecisionsValid) return;

            simulateMarket();
            displayPeriodResults();
            document.getElementById('period-decisions').classList.add('hidden');
            document.getElementById('period-results').classList.remove('hidden');
            document.getElementById('results-period-number').innerText = gameState.period;
            isGameSavedSinceLastChange = false;
            saveStateToHistory();
            autoSaveGame();
        }


        function simulateMarket() {
            const offers = gameState.groups.map((group, index) => ({
                groupIndex: index,
                offeredQuantity: group.decisions.production + group.decisions.sellFromInventory,
                price: group.decisions.price,
                soldQuantity: 0, revenue: 0
            }));
            offers.sort((a, b) => a.price - b.price);

            let totalOfferedQuantity = offers.reduce((sum, offer) => sum + offer.offeredQuantity, 0);
            let totalValueOffered = offers.reduce((sum, offer) => sum + (offer.offeredQuantity * offer.price), 0);
            let weightedAveragePrice = totalValueOffered > 0 ? totalValueOffered / totalOfferedQuantity : FIXED_PARAMETERS.demandReferencePrice;

            // Basis-Nachfrageberechnung unter Berücksichtigung der minimalen Elastizitätsauswirkung
            let priceElasticityComponent = 1 - FIXED_PARAMETERS.priceElasticityFactor * (weightedAveragePrice / FIXED_PARAMETERS.demandReferencePrice - 1);
            priceElasticityComponent = Math.max(FIXED_PARAMETERS.minPriceElasticityDemandMultiplier, priceElasticityComponent);

            let calculatedMarketDemand = gameState.initialBaseDemand * priceElasticityComponent;
            calculatedMarketDemand = Math.max(0, Math.floor(calculatedMarketDemand)); // Ensure it's not negative overall and is an integer

            let marketSummary = {
                totalOffered: totalOfferedQuantity, calculatedMarketDemand, totalSold: 0, totalRevenue: 0,
                averagePrice: weightedAveragePrice, averageMarketing: 0, // averageMarketing wird hier nicht mehr für die Gesamtnachfrage genutzt
                potentialDemandAtPrices: []
            };

            const pricePointsForAnalysis = [FIXED_PARAMETERS.demandReferencePrice * 0.5, FIXED_PARAMETERS.demandReferencePrice, FIXED_PARAMETERS.demandReferencePrice * 1.5];
            pricePointsForAnalysis.forEach(price => {
                let potentialDemandElasticityComponent = 1 - FIXED_PARAMETERS.priceElasticityFactor * (price / FIXED_PARAMETERS.demandReferencePrice - 1);
                potentialDemandElasticityComponent = Math.max(FIXED_PARAMETERS.minPriceElasticityDemandMultiplier, potentialDemandElasticityComponent);
                const potentialDemand = gameState.initialBaseDemand * potentialDemandElasticityComponent; // Marketing hier nicht mehr global
                marketSummary.potentialDemandAtPrices.push({ price: price, demand: Math.max(0, Math.floor(potentialDemand)) });
            });

            let remainingDemand = calculatedMarketDemand;
            const priceLevels = [...new Set(offers.map(offer => offer.price))].sort((a, b) => a - b);

            priceLevels.forEach(currentPrice => {
                if (remainingDemand <= 0) return;
                const offersAtThisPrice = offers.filter(offer => offer.price === currentPrice && offer.offeredQuantity > 0);
                if (offersAtThisPrice.length === 0) return;

                // Berechne gewichtete angebotene Mengen basierend auf individuellem Marketing (nur Periode 5)
                let totalEffectiveOfferedAtThisPrice = 0;
                offersAtThisPrice.forEach(offer => {
                    const group = gameState.groups[offer.groupIndex];
                    let marketingBonusFactor = 1.0;
                    if (gameState.period === 5) {
                        marketingBonusFactor += (group.oneTimeMarketing - 5) * FIXED_PARAMETERS.marketingEffectivenessFactor;
                        marketingBonusFactor = Math.max(0.5, Math.min(1.5, marketingBonusFactor)); // Bonus/Malus begrenzen
                    }
                    offer.effectiveOfferedQuantity = offer.offeredQuantity * marketingBonusFactor;
                    totalEffectiveOfferedAtThisPrice += offer.effectiveOfferedQuantity;
                });

                const actualOfferedAtThisPrice = offersAtThisPrice.reduce((sum, offer) => sum + offer.offeredQuantity, 0);
                const quantityToSellAtThisPrice = Math.min(remainingDemand, actualOfferedAtThisPrice); // Verkaufsmenge kann nicht größer sein als tatsächlich angeboten
                let soldAtThisPrice = 0;

                if (totalEffectiveOfferedAtThisPrice > 0) {
                    offersAtThisPrice.forEach(offer => {
                        const proportion = offer.effectiveOfferedQuantity / totalEffectiveOfferedAtThisPrice;
                        let soldUnits = Math.floor(quantityToSellAtThisPrice * proportion);
                        soldUnits = Math.min(soldUnits, offer.offeredQuantity - offer.soldQuantity); // Nicht mehr verkaufen als angeboten

                        offer.soldQuantity += soldUnits;
                        offer.revenue += soldUnits * offer.price;
                        remainingDemand -= soldUnits;
                        soldAtThisPrice += soldUnits;
                    });
                }
                 // Ggf. Restmengen bei Rundungsdifferenzen noch an die "besten" Marketing-Anbieter verteilen (optional, für mehr Präzision)
                if (remainingDemand > 0 && soldAtThisPrice < quantityToSellAtThisPrice) {
                    let stillToSell = quantityToSellAtThisPrice - soldAtThisPrice;
                    offersAtThisPrice.sort((a,b) => b.effectiveOfferedQuantity - a.effectiveOfferedQuantity); // Bevorzuge die mit besserem Marketing
                    for (const offer of offersAtThisPrice) {
                        if (stillToSell <= 0) break;
                        const canSellMore = offer.offeredQuantity - offer.soldQuantity;
                        if (canSellMore > 0) {
                            const sellNow = Math.min(1, canSellMore); // Verteile einzeln
                            offer.soldQuantity += sellNow;
                            offer.revenue += sellNow * offer.price;
                            remainingDemand -= sellNow;
                            soldAtThisPrice += sellNow;
                            stillToSell -= sellNow;
                        }
                    }
                }


                marketSummary.totalSold += soldAtThisPrice;
                marketSummary.totalRevenue += soldAtThisPrice * currentPrice;
            });

            gameState.groups.forEach((group, index) => {
                const offer = offers.find(o => o.groupIndex === index);
                const producedQuantity = group.decisions.production;
                const soldQuantity = offer.soldQuantity;
                const soldFromInventory = Math.min(group.decisions.sellFromInventory, Math.max(0, soldQuantity - producedQuantity));
                const soldFromProduction = soldQuantity - soldFromInventory;

                let machinesForCostCalc = [...group.machines];
                if (group.decisions.machineToBuy) {
                    machinesForCostCalc.push(group.decisions.machineToBuy);
                }
                machinesForCostCalc.sort((a, b) => a.variableCostPerUnit - b.variableCostPerUnit);


                let totalVariableCosts = 0;
                let remainingProductionToCost = producedQuantity;

                machinesForCostCalc.forEach(machine => {
                    if (remainingProductionToCost <= 0) return;

                    let machineEffectiveCapacityThisPeriod = machine.capacity;
                    // Prüfen, ob es eine bereits existierende Maschine ist oder eine neu gekaufte
                    const isExistingMachine = group.machines.find(m => m.name === machine.name && m.cost === machine.cost); // Annahme: Name und Kosten identifizieren eine Maschine eindeutig
                    if (isExistingMachine) {
                         machineEffectiveCapacityThisPeriod = machine.capacity * Math.max(0, 1 - FIXED_PARAMETERS.machineDegradationRate * (gameState.period - 1));
                    } // Für eine neue Maschine (die in machineToBuy ist, aber noch nicht in group.machines) ist die Degradation 0.

                    const unitsProducedByThisMachine = Math.min(remainingProductionToCost, Math.floor(machineEffectiveCapacityThisPeriod));
                    const effectiveVariableCost = (FIXED_PARAMETERS.isRndEnabled && group.rndBenefitApplied) ? machine.variableCostPerUnit * (1 - FIXED_PARAMETERS.rndVariableCostReduction) : machine.variableCostPerUnit;
                    totalVariableCosts += unitsProducedByThisMachine * effectiveVariableCost;
                    remainingProductionToCost -= unitsProducedByThisMachine;
                });

                const inventoryCost = Math.floor(group.inventory) * FIXED_PARAMETERS.inventoryCostPerUnit;
                let periodProfit = offer.revenue - totalVariableCosts - inventoryCost - (FIXED_PARAMETERS.isRndEnabled ? group.decisions.rndInvestment : 0);
                if (group.decisions.marketAnalysisBought) periodProfit -= FIXED_PARAMETERS.marketAnalysisCost;

                const capitalBeforeInterest = group.capital + periodProfit;
                let interestCost = 0;
                if (capitalBeforeInterest < 0) {
                    interestCost = Math.abs(capitalBeforeInterest) * FIXED_PARAMETERS.negativeCashInterestRate;
                    periodProfit -= interestCost;
                }
                group.capital += periodProfit;
                group.cumulativeProfit += periodProfit; // Neu hinzugefügt
                group.inventory += producedQuantity - soldFromProduction;
                group.inventory -= soldFromInventory;
                group.inventory = Math.max(0, Math.floor(group.inventory));

                if (FIXED_PARAMETERS.isRndEnabled) {
                    group.cumulativeRndInvestment += group.decisions.rndInvestment;
                    if (group.cumulativeRndInvestment >= FIXED_PARAMETERS.rndBenefitThreshold && !group.rndBenefitApplied) {
                        group.rndBenefitApplied = true;
                    }
                }

                if (group.decisions.machineToBuy) {
                    const machine = group.decisions.machineToBuy;
                    if (group.capital >= machine.cost) {
                        group.machines.push({name: machine.name, cost: machine.cost, capacity: machine.capacity, variableCostPerUnit: machine.variableCostPerUnit});
                        group.capital -= machine.cost;
                    } else {
                         showNotification(`${group.name} konnte Maschine ${machine.name} nicht kaufen (Kapital ${formatCurrency(group.capital)} vs Kosten ${formatCurrency(machine.cost)} nach Periodenberechnung).`);
                    }
                }
                group.results = {
                    offeredQuantity: offer.offeredQuantity, producedQuantity, sellFromInventory: group.decisions.sellFromInventory,
                    soldQuantity: Math.floor(soldQuantity), soldFromProduction: Math.floor(soldFromProduction),
                    soldFromInventory: Math.floor(soldFromInventory), price: offer.price, revenue: offer.revenue,
                    variableCosts: totalVariableCosts, inventoryCost, marketAnalysisBought: group.decisions.marketAnalysisBought,
                    rndInvestment: FIXED_PARAMETERS.isRndEnabled ? group.decisions.rndInvestment : 0,
                    marketingCost: 0,
                    interestCost, periodProfit,
                    newCapital: group.capital, endInventory: Math.floor(group.inventory)
                };
            });
            gameState.lastPeriodMarketSummary = marketSummary;
            gameState.lastPeriodMarketSummary.totalSold = Math.floor(gameState.lastPeriodMarketSummary.totalSold);
            gameState.history.marketSummary.push(marketSummary);
        }


        function displayPeriodResults() {
            const resultsSummaryDiv = document.getElementById('results-summary');
            const showNextPeriodTaskButton = document.getElementById('show-next-period-task-button');
            const showGroupResultsButton = document.getElementById('show-group-results-button');

            let summaryHTML = `
                <p>Initiale Basis-Marktnachfrage: ${gameState.initialBaseDemand.toFixed(0)} Einheiten</p>
                <p>Gewichteter Durchschnittspreis der Angebote: ${formatCurrency(gameState.lastPeriodMarketSummary.averagePrice)}</p>
                <p>Berechnete Marktnachfrage in dieser Periode: ${Math.floor(gameState.lastPeriodMarketSummary.calculatedMarketDemand)} Einheiten</p>
                <p>Gesamt angebotene Menge: ${Math.floor(gameState.lastPeriodMarketSummary.totalOffered)} Einheiten</p>
                <p>Gesamt verkaufte Menge: ${Math.floor(gameState.lastPeriodMarketSummary.totalSold)} Einheiten</p>
                <p>Gesamtumsatz am Markt: ${formatCurrency(gameState.lastPeriodMarketSummary.totalRevenue)}</p>`;
            resultsSummaryDiv.innerHTML = summaryHTML;

            showGroupResultsButton.classList.remove('hidden');
            showNextPeriodTaskButton.classList.remove('hidden');
        }

        function showGroupResultsModal() {
            const modal = document.getElementById('groupResultsModal');
            const modalPeriodNumberSpan = document.getElementById('modal-period-number');
            const modalContentDiv = document.getElementById('group-results-modal-content');
            modalPeriodNumberSpan.innerText = gameState.period;
            let groupResultsHTML = '';
            gameState.groups.forEach(group => {
                const previousPeriodState = gameState.history.states.find(state => state.period === gameState.period -1);
                let startCapital = 'N/A';
                 if (gameState.period === 1) {
                    const initialState = gameState.history.states.find(state => state.period === 0);
                    if (initialState) {
                        const groupInInitialState = initialState.groups.find(g => g.id === group.id);
                         if (groupInInitialState) {
                            startCapital = formatCurrency(FIXED_PARAMETERS.startingCapital);
                        }
                    }
                } else if (previousPeriodState) {
                    const groupInPreviousState = previousPeriodState.groups.find(g => g.id === group.id);
                    if (groupInPreviousState) startCapital = formatCurrency(groupInPreviousState.capital);
                }


                const profitLossClass = group.results.periodProfit >= 0 ? 'profit' : 'loss';
                const nextPeriodEffectiveCapacity = group.machines.reduce((sum, machine) => {
                    const effectiveCapacity = machine.capacity * Math.max(0, 1 - FIXED_PARAMETERS.machineDegradationRate * (gameState.period));
                    return sum + effectiveCapacity;
                }, 0);
                const roundedNextPeriodEffectiveCapacity = Math.floor(nextPeriodEffectiveCapacity);
                let rndTableRows = '';
                if (FIXED_PARAMETERS.isRndEnabled) {
                    rndTableRows = `
                        <tr><td>F&E Investition in dieser Periode:</td><td>${formatCurrency(group.results.rndInvestment)}</td></tr>
                        <tr><td>Kumulierte F&E Investition:</td><td>${formatCurrency(group.cumulativeRndInvestment)}</td></tr>
                        <tr><td>F&E Vorteil angewendet:</td><td>${group.rndBenefitApplied ? 'Ja' : 'Nein'}</td></tr>`;
                }

                let marketAnalysisHTML = '';
                if (group.results.marketAnalysisBought && gameState.lastPeriodMarketSummary) {
                    marketAnalysisHTML = `
                        <div class="market-analysis-section mt-6 pt-4 border-t border-[var(--heading-border-color)]">
                            <h5 class="font-semibold text-md mb-2" style="color: var(--subheading-color);">Marktanalyse (Periode ${gameState.period})</h5>
                            <h6 class="font-semibold mt-3 mb-1">Marktzusammenfassung:</h6>
                            <table class="results-table"><tbody>
                                <tr><td>Gewichteter Durchschnittspreis der Angebote:</td><td>${formatCurrency(gameState.lastPeriodMarketSummary.averagePrice)}</td></tr>
                                <tr><td>Berechnete Marktnachfrage:</td><td>${Math.floor(gameState.lastPeriodMarketSummary.calculatedMarketDemand)} Einh.</td></tr>
                                <tr><td>Gesamtangebot:</td><td>${Math.floor(gameState.lastPeriodMarketSummary.totalOffered)} Einh.</td></tr>
                                <tr><td>Gesamtverkauf:</td><td>${Math.floor(gameState.lastPeriodMarketSummary.totalSold)} Einh.</td></tr>
                                <tr><td>Gesamtumsatz Markt:</td><td>${formatCurrency(gameState.lastPeriodMarketSummary.totalRevenue)}</td></tr>
                            </tbody></table>`;
                    if (gameState.lastPeriodMarketSummary.potentialDemandAtPrices) {
                        marketAnalysisHTML += '<h6 class="font-semibold mt-3 mb-1">Potenzielle Nachfrage:</h6><table class="results-table"><tbody>';
                        gameState.lastPeriodMarketSummary.potentialDemandAtPrices.forEach(item => {
                            marketAnalysisHTML += `<tr><td>Bei ${formatCurrency(item.price)}:</td><td>ca. ${Math.floor(item.demand)} Einh.</td></tr>`;
                        });
                        marketAnalysisHTML += '</tbody></table>';
                    }
                    marketAnalysisHTML += `
                            <h6 class="font-semibold mt-3 mb-1">Konkurrenzinformationen:</h6>
                            <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead><tr><th>Gruppe</th><th>Kumulierter Gewinn</th><th>Angebot</th><th>Preis</th><th>Produktion</th><th>Lager (Ende)</th></tr></thead>
                                <tbody>
                                    ${gameState.groups.map(g =>
                                        `<tr>
                                            <td>${g.name}</td>
                                            <td>${formatCurrency(g.cumulativeProfit)}</td>
                                            <td>${Math.floor(g.results.offeredQuantity)}</td>
                                            <td>${formatCurrency(g.results.price)}</td>
                                            <td>${Math.floor(g.results.producedQuantity)}</td>
                                            <td>${Math.floor(g.results.endInventory)}</td>
                                        </tr>`
                                    ).join('')}
                                </tbody>
                            </table>
                            </div>
                        </div>`;
                }


                groupResultsHTML += `
                    <div class="group-result-block"><h4>Ergebnisse für ${group.name} - Periode ${gameState.period}</h4>
                    <table class="results-table"><tbody>
                        <tr><td>Kontostand zu Beginn der Periode:</td><td>${startCapital}</td></tr>
                        <tr><td>Produzierte Einheiten:</td><td>${Math.floor(group.results.producedQuantity)}</td></tr>
                        <tr><td>Aus Lager angebotene Einheiten:</td><td>${Math.floor(group.results.sellFromInventory)}</td></tr>
                        <tr><td>Angebote Einheiten gesamt:</td><td>${Math.floor(group.results.offeredQuantity)}</td></tr>
                        <tr><td>Verkaufspreis pro Einheit:</td><td>${formatCurrency(group.results.price)}</td></tr>
                        <tr><td>Verkaufte Einheiten:</td><td>${Math.floor(group.results.soldQuantity)}</td></tr>
                        <tr><td>Umsatz:</td><td>${formatCurrency(group.results.revenue)}</td></tr>
                        <tr><td>Variable Produktionskosten:</td><td>${formatCurrency(group.results.variableCosts)}</td></tr>
                        <tr><td>Lagerkosten:</td><td>${formatCurrency(group.results.inventoryCost)}</td></tr>
                        <tr><td>Marktanalyse Kosten:</td><td>${formatCurrency(group.results.marketAnalysisBought ? FIXED_PARAMETERS.marketAnalysisCost : 0)}</td></tr>
                        ${rndTableRows}
                        <tr><td>Zinskosten (Negativsaldo):</td><td>${formatCurrency(group.results.interestCost)}</td></tr>
                        <tr><td>Gewinn oder Verlust in dieser Periode:</td><td><span class="${profitLossClass}">${formatCurrency(group.results.periodProfit)}</span></td></tr>
                        <tr><td>Kontostand am Ende der Periode:</td><td>${formatCurrency(group.results.newCapital)}</td></tr>
                        <tr><td>Kumulierter Gewinn:</td><td>${formatCurrency(group.cumulativeProfit)}</td></tr>
                        <tr><td>Lagerbestand (Ende Periode):</td><td>${Math.floor(group.results.endInventory)} Einheiten</td></tr>
                        <tr><td>Produktionskapazität für Periode ${gameState.period + 1}:</td><td>${roundedNextPeriodEffectiveCapacity} Einheiten</td></tr>
                    </tbody></table>
                    ${marketAnalysisHTML}
                    </div>`;
            });
            modalContentDiv.innerHTML = groupResultsHTML;
            modal.style.display = 'block';
        }

        function hideGroupResultsModal() {
            document.getElementById('groupResultsModal').style.display = 'none';
        }

        function printGroupResults() {
            const modalTitle = document.getElementById('group-results-modal-title').innerText;
            const modalContentDiv = document.getElementById('group-results-modal-content');
            let printableContent = `<h2>${modalTitle}</h2>`;

            const groupResultBlocks = modalContentDiv.querySelectorAll('.group-result-block');
            groupResultBlocks.forEach((block, index) => {
                const groupResultTable = block.querySelector('table.results-table');
                const groupTitleElement = block.querySelector('h4');
                const marketAnalysisSection = block.querySelector('.market-analysis-section');
                const group = gameState.groups[index];

                if (index > 0) {
                    printableContent += '<div class="page-break"></div>';
                }

                if (groupTitleElement && groupResultTable) {
                    printableContent += `<h3>${groupTitleElement.innerText}</h3>`;
                    printableContent += groupResultTable.outerHTML;
                }

                printableContent += '<div class="page-break"></div>';

                if (marketAnalysisSection && group.results.marketAnalysisBought) {
                    printableContent += `<h3 style="text-align:center; margin-bottom:10px;">Marktanalyse für ${group.name} (Periode ${gameState.period})</h3>`;
                    printableContent += marketAnalysisSection.innerHTML;
                } else {
                    printableContent += `<p class="no-analysis-message-print">Es wurde keine Marktanalyse von Gruppe ${group.name} gekauft.</p>`;
                }
            });


            const printWindow = window.open('', '_blank');
            printWindow.document.open();
            printWindow.document.write(`<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>${modalTitle}</title>
                <style>
                    body { font-family: 'Inter', sans-serif; line-height: 1.5; padding: 10px; color: #333; font-size: 9pt; }
                    h2 { color: #0A2540; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #E2E8F0; padding-bottom: 5px; font-size: 1.1em; }
                    h3 { color: #1E3A8A; margin-top: 15px; margin-bottom: 5px; font-size: 1em; }
                    h4 { color: #1E3A8A; margin-top: 15px; margin-bottom: 5px; font-size: 1em; }
                    h5 { color: #1E3A8A; font-weight:600; font-size: 0.85em; margin-top:8px; margin-bottom:4px;}
                    h6 { font-weight:600; font-size: 0.8em; margin-top:6px; margin-bottom:2px;}
                    .profit { color: green !important; font-weight: bold; } .loss { color: red !important; font-weight: bold; }
                    .page-break { page-break-after: always !important; height:0 !important; display:block !important; visibility: hidden !important; }
                    table.results-table { width: 100%; margin-top: 8px; border-collapse: collapse; font-size: 0.9em; }
                    table.results-table td { border: 1px solid #ccc !important; padding: 4px; vertical-align: top; }
                    table.results-table td:first-child { font-weight: bold; width: 60%;}
                    table.results-table td:last-child { text-align: right; width: 40%;}
                    .market-analysis-section table { width: 100%; margin-top: 4px; font-size: 0.8em;}
                    .market-analysis-section table th, .market-analysis-section table td { border: 1px solid #ccc !important; padding: 2px; text-align: left;}
                    .market-analysis-section table th { background-color: #f0f0f0; }
                    .market-analysis-section table td:first-child { width: auto; font-weight:normal; }
                    .market-analysis-section table td:last-child { text-align: left; width: auto; }
                    .no-analysis-message-print { text-align:center; font-style:italic; color:#888; margin-top: 30mm; font-size: 1em; page-break-before: avoid; }
                    @media print {
                        body { margin: 0; padding: 0; font-size: 9pt; }
                        h2 { margin-top: 10px; margin-bottom: 5px; padding-bottom: 3px; font-size: 1em; border-bottom: 1px solid #ccc; }
                        h3 { margin-top: 10px; margin-bottom: 3px; font-size: 0.9em; }
                    }
                </style></head><body>${printableContent}</body></html>`);
            printWindow.document.close();
            printWindow.print();
        }

        function showResetToPeriod() {
            const resetModal = document.getElementById('resetModal');
            const selectElement = document.getElementById('reset-period-select');
            selectElement.innerHTML = '';

            const addedOptionTexts = new Set(); // To prevent duplicate texts

            gameState.history.states.forEach((state, index) => {
                let optionText;
                const periodLabel = `Periode ${state.period}`;
                let uniqueOptionIdentifier = `idx${index}_p${state.period}`; // Use index to make it unique even if text is same

                if (state.period === 0) {
                    optionText = `${periodLabel} (Maschinenauswahl)`;
                    uniqueOptionIdentifier += "-machine"; // This identifier is for the text uniqueness check
                } else {
                    const hasMarketSummary = !!state.marketSummary;
                    if (hasMarketSummary) {
                         optionText = `${periodLabel} - Nach Ergebnissen`;
                         uniqueOptionIdentifier += "-after";
                    } else {
                         optionText = `${periodLabel} - Vor Entscheidungen`;
                         uniqueOptionIdentifier += "-before";
                    }
                }
                if (!addedOptionTexts.has(optionText)) { // Check unique *text* to avoid user confusion
                    const option = document.createElement('option');
                    option.value = index; // Value is the index in history.states
                    option.innerText = optionText;
                    selectElement.appendChild(option);
                    addedOptionTexts.add(optionText);
                }
            });
            resetModal.style.display = 'block';
        }

        function hideResetToPeriod() { document.getElementById('resetModal').style.display = 'none'; }

        function resetToSelectedPeriod() {
            const selectElement = document.getElementById('reset-period-select');
            const selectedIndex = parseInt(selectElement.value);
            if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= gameState.history.states.length) {
                showNotification("Ungültige Periodenauswahl."); return;
            }
            const stateToLoad = gameState.history.states[selectedIndex];
            gameState.period = stateToLoad.period;
            gameState.groups = JSON.parse(JSON.stringify(stateToLoad.groups));
            gameState.lastPeriodMarketSummary = stateToLoad.marketSummary ? JSON.parse(JSON.stringify(stateToLoad.marketSummary)) : null;
            gameState.initialBaseDemand = stateToLoad.initialBaseDemand;
            gameState.history.states = gameState.history.states.slice(0, selectedIndex + 1);
            gameState.history.periods = gameState.history.periods.slice(0, gameState.history.states.findIndex(s => s.period === gameState.period) +1 );
            gameState.history.marketSummary = gameState.history.marketSummary.slice(0, selectedIndex); // Market summary is for *completed* period
             Object.keys(gameState.history.groupCapital).forEach(groupName => {
                gameState.history.groupCapital[groupName] = gameState.history.groupCapital[groupName].slice(0, gameState.period + 1);
            });
            Object.keys(gameState.history.groupData).forEach(groupName => { // Reset chart data as well
                if(gameState.history.groupData[groupName] && gameState.history.groupData[groupName].periods) {
                    gameState.history.groupData[groupName].periods = gameState.history.groupData[groupName].periods.slice(0, gameState.period);
                }
            });


            lastPeriodStateIndex = gameState.history.states.length - 1;
            document.getElementById('current-period').innerText = gameState.period;
            hideResetToPeriod();

            document.getElementById('game-end').classList.add('hidden');
            document.getElementById('game-in-progress').classList.remove('hidden');

            if (gameState.period === 0) {
                document.getElementById('period-results').classList.add('hidden');
                document.getElementById('period-decisions').classList.add('hidden');
                document.getElementById('machine-selection').classList.remove('hidden');
                const supportingMaterialBtnIngame = document.getElementById('supporting-material-button-ingame');
                if (supportingMaterialBtnIngame) supportingMaterialBtnIngame.classList.add('hidden');
                setupMachineSelection();
            } else {
                document.getElementById('period-results').classList.add('hidden');
                document.getElementById('machine-selection').classList.add('hidden');
                document.getElementById('period-decisions').classList.remove('hidden');
                 const supportingMaterialBtnIngame = document.getElementById('supporting-material-button-ingame');
                if (supportingMaterialBtnIngame) supportingMaterialBtnIngame.classList.remove('hidden');
                setupPeriodInputs();
            }
            isGameSavedSinceLastChange = false; // Nach dem Zurücksetzen ist der Zustand ungespeichert
             showNotification(`Spiel zurückgesetzt auf Periode ${gameState.period}.`, 'success');
        }


        function showManualCorrection() {
            const correctionModal = document.getElementById('manualCorrectionModal');
            const groupSelect = document.getElementById('correction-group-select');
            const fieldsDiv = document.getElementById('manual-correction-fields');
            groupSelect.innerHTML = ''; fieldsDiv.innerHTML = '';
            gameState.groups.forEach(group => {
                const option = document.createElement('option');
                option.value = group.id; option.innerText = group.name;
                groupSelect.appendChild(option);
            });
            groupSelect.onchange = function() {
                const selectedGroup = gameState.groups.find(g => g.id === parseInt(groupSelect.value));
                let rndFieldsHTML = '';
                if (FIXED_PARAMETERS.isRndEnabled) {
                    rndFieldsHTML = `
                        <div class="form-group"><label for="correction-cumulative-rnd">Kumulierte F&E Investition (€):</label><input type="number" id="correction-cumulative-rnd" value="${selectedGroup.cumulativeRndInvestment.toFixed(2)}" min="0" step="0.01"></div>
                        <div class="form-group"><label for="correction-rnd-applied">F&E Vorteil angewendet:</label><input type="checkbox" id="correction-rnd-applied" ${selectedGroup.rndBenefitApplied ? 'checked' : ''}></div>`;
                }

                if (selectedGroup) {
                    fieldsDiv.innerHTML = `
                        <h4 class="font-semibold mt-4">Daten für ${selectedGroup.name} korrigieren:</h4>
                        <div class="form-group"><label for="correction-capital">Kapital (€):</label><input type="number" id="correction-capital" value="${selectedGroup.capital.toFixed(2)}" step="0.01"></div>
                        <div class="form-group"><label for="correction-cumulative-profit">Kumulierter Gewinn (€):</label><input type="number" id="correction-cumulative-profit" value="${selectedGroup.cumulativeProfit.toFixed(2)}" step="0.01"></div>
                        <div class="form-group"><label for="correction-inventory">Lagerbestand:</label><input type="number" id="correction-inventory" value="${Math.floor(selectedGroup.inventory)}" min="0"></div>
                        ${rndFieldsHTML}
                        <div class="form-group"><label for="correction-one-time-marketing">Einmaliges Marketing (Periode 5):</label><input type="number" id="correction-one-time-marketing" value="${selectedGroup.oneTimeMarketing}" min="0" max="10"></div>`;
                } else { fieldsDiv.innerHTML = ''; }
            };
            if (gameState.groups.length > 0) groupSelect.onchange();
            correctionModal.style.display = 'block';
        }
        function hideManualCorrection() { document.getElementById('manualCorrectionModal').style.display = 'none'; }

        function applyManualCorrection() {
            const selectedGroup = gameState.groups.find(g => g.id === parseInt(document.getElementById('correction-group-select').value));
            if (!selectedGroup) { showNotification("Bitte wählen Sie eine Gruppe aus."); return; }

            const newCapital = parseFloat(document.getElementById('correction-capital').value);
            const newInventory = parseInt(document.getElementById('correction-inventory').value);
            const newOneTimeMarketing = parseInt(document.getElementById('correction-one-time-marketing').value);
            let newCumulativeRnd = selectedGroup.cumulativeRndInvestment; // Beibehaltung des alten Wertes, falls F&E deaktiviert
            let newRndApplied = selectedGroup.rndBenefitApplied;
            let newCumulativeProfit = parseFloat(document.getElementById('correction-cumulative-profit').value); // Neu

            if (FIXED_PARAMETERS.isRndEnabled) {
                newCumulativeRnd = parseFloat(document.getElementById('correction-cumulative-rnd').value);
                newRndApplied = document.getElementById('correction-rnd-applied').checked;
                 if (isNaN(newCumulativeRnd) || newCumulativeRnd < 0) {
                    showNotification("Ungültiger Wert für kumulierte F&E Investition."); return;
                }
            }


            if (isNaN(newCapital) || isNaN(newInventory) || newInventory < 0 || !Number.isInteger(newInventory) || isNaN(newOneTimeMarketing) || newOneTimeMarketing < 0 || newOneTimeMarketing > 10 || isNaN(newCumulativeProfit)) {
                showNotification("Ungültige Werte für die Korrektur. Lagerbestand muss eine ganze Zahl sein."); return;
            }
            selectedGroup.capital = newCapital; selectedGroup.inventory = newInventory;
            selectedGroup.cumulativeRndInvestment = newCumulativeRnd;
            selectedGroup.rndBenefitApplied = newRndApplied;
            selectedGroup.oneTimeMarketing = newOneTimeMarketing;
            selectedGroup.cumulativeProfit = newCumulativeProfit; // Neu

            // Update history for the current state
            const currentStateInHistory = gameState.history.states.find(s => s.period === gameState.period);
            if (currentStateInHistory) {
                const groupInHistory = currentStateInHistory.groups.find(g => g.id === selectedGroup.id);
                if (groupInHistory) {
                    groupInHistory.capital = newCapital;
                    groupInHistory.inventory = newInventory;
                    groupInHistory.cumulativeRndInvestment = newCumulativeRnd;
                    groupInHistory.rndBenefitApplied = newRndApplied;
                    groupInHistory.oneTimeMarketing = newOneTimeMarketing;
                    groupInHistory.cumulativeProfit = newCumulativeProfit; // Neu
                }
            }

            isGameSavedSinceLastChange = false; // Änderungen wurden vorgenommen
            showNotification(`Manuelle Korrektur für Gruppe ${selectedGroup.name} angewendet.`, 'success');
            displayPeriodResults(); // Re-render results based on correction
            hideManualCorrection();
        }

        function goToInitialSetup() {
            document.getElementById('machine-selection').classList.add('hidden');
            document.getElementById('period-decisions').classList.add('hidden');
            document.getElementById('period-results').classList.add('hidden');
            document.getElementById('game-in-progress').classList.add('hidden');
            document.getElementById('game-end').classList.add('hidden');
            document.getElementById('initial-setup').classList.remove('hidden');
            document.getElementById('show-next-period-task-button').classList.add('hidden');
            document.getElementById('show-group-results-button').classList.add('hidden');
            // document.getElementById('print-student-template-button').classList.add('hidden'); // Entfernt
            hideNextPeriodTaskModal(); hideInfo();
            gameState = {}; numberOfGroups = 3; lastPeriodStateIndex = -1;
            isGameSavedSinceLastChange = true; // Neues Spiel, keine ungespeicherten Änderungen
            setupGroupSelectionDropdown(); setupGroupNameInputs();
        }

        function goToMachineSelection() {
            document.getElementById('period-decisions').classList.add('hidden');
            document.getElementById('machine-selection').classList.remove('hidden');
            document.getElementById('current-period').innerText = 0;
            document.getElementById('show-next-period-task-button').classList.add('hidden');
            document.getElementById('show-group-results-button').classList.add('hidden');
            // document.getElementById('print-student-template-button').classList.remove('hidden'); // Entfernt
            const supportingMaterialBtnIngame = document.getElementById('supporting-material-button-ingame');
            if (supportingMaterialBtnIngame) supportingMaterialBtnIngame.classList.add('hidden');
            hideNextPeriodTaskModal(); hideInfo();

            const stateToLoad = gameState.history.states.find(state => state.period === 0); // Load state for period 0
            if (stateToLoad) {
                gameState.period = 0;
                gameState.groups = JSON.parse(JSON.stringify(stateToLoad.groups));
                 // Reset machines and capital to before initial purchase for period 0
                gameState.groups.forEach(group => {
                    group.capital = FIXED_PARAMETERS.startingCapital;
                    group.machines = [];
                });
                gameState.initialBaseDemand = stateToLoad.initialBaseDemand;
                gameState.history.states = gameState.history.states.filter(state => state.period <= 0);
                gameState.history.periods = gameState.history.periods.slice(0, 1);
                gameState.history.marketSummary = [];
                lastPeriodStateIndex = gameState.history.states.length - 1;
                isGameSavedSinceLastChange = false; // Zustand wurde geändert (zurückgesetzt)
                setupMachineSelection();
            } else {
                goToInitialSetup(); // Fallback if period 0 state is missing
            }
        }

        function startPeriodTaskTimer() {
            clearInterval(periodTaskTimerInterval); // Clear any existing timer
            const timerDisplay = document.getElementById('period-task-timer');
            if (!timerDisplay) return;

            let duration = FIXED_PARAMETERS.timerDurationMinutes * 60; // in seconds

            periodTaskTimerInterval = setInterval(() => {
                const minutes = Math.floor(Math.abs(duration) / 60);
                const seconds = Math.abs(duration) % 60;
                const sign = duration < 0 ? "-" : "";

                timerDisplay.textContent = `${sign}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                timerDisplay.style.color = duration < 0 ? 'var(--loss-color)' : 'var(--body-text-color)';

                if (duration > -36000) { // Prevent excessive negative counting, e.g., more than 10 hours
                    duration--;
                } else if (duration === -36000) {
                     timerDisplay.textContent = "-10:00:00+"; // Indicate it's gone very far
                }

            }, 1000);
        }


        function showNextPeriodTaskModal(nextPeriodNumber) {
            const modal = document.getElementById('nextPeriodTaskModal');
            const title = document.getElementById('next-period-task-title');
            const content = document.getElementById('next-period-task-content');
            title.innerText = `Arbeitsauftrag für Periode ${nextPeriodNumber}`;
            let rndTaskHTML = '';
            if (FIXED_PARAMETERS.isRndEnabled && nextPeriodNumber >=3) {
                rndTaskHTML = `<li><strong>Forschung & Entwicklung investieren:</strong> Investieren Sie in F&E, um Ihre variablen Kosten zu senken.</li>`;
            }
            let machineTaskHTML = '';
            if (nextPeriodNumber >= 3 && (nextPeriodNumber - 3) % 3 === 0) {
                machineTaskHTML = `<li><strong>Zusätzliche Maschine kaufen:</strong> Prüfen Sie, ob Sie eine neue Maschine kaufen möchten und können.</li>`;
            }

            let taskHTML = `<p class="mb-4">Die Auswertung von Periode ${nextPeriodNumber - 1} ist abgeschlossen. Machen Sie sich nun bereit für Periode ${nextPeriodNumber}.</p>
                <h3 class="font-semibold mb-2">Ihr Arbeitsauftrag für Periode ${nextPeriodNumber}:</h3><ul>
                <li>Besprechen Sie Ihre Ergebnisse aus Periode ${nextPeriodNumber - 1}.</li>
                <li>Analysieren Sie die Marktsituation (falls Sie die Marktanalyse gekauft haben).</li>
                <li>Treffen Sie gemeinsam die Entscheidungen für die kommende Periode ${nextPeriodNumber}:<ul>
                <li>Produktionsmenge</li><li>Verkaufen aus Lagerbestand</li><li>Verkaufspreis</li>
                ${nextPeriodNumber === 5 ? `<li><strong>Marketing Bemühung (1-10):</strong> Planen Sie Ihre einmalige Marketingkampagne!</li>` : ''}
                <li>Marktanalyse kaufen (Ja/Nein)</li>
                ${rndTaskHTML}
                ${machineTaskHTML}
                </ul></li><li>Tragen Sie Ihre Entscheidungen in die Vorlage ein.</li>
                </ul>
                <p class="mt-4">Klicken Sie auf "Nächste Periode starten", um zur Eingabemaske zu gelangen.</p>`;
            content.innerHTML = taskHTML;
            modal.style.display = 'block';
            startPeriodTaskTimer(); // Timer starten, wenn das Modal angezeigt wird
        }
        function hideNextPeriodTaskModal() {
            clearInterval(periodTaskTimerInterval); // Timer stoppen
            document.getElementById('nextPeriodTaskModal').style.display = 'none';
            document.body.style.overflow = ''; // Scrollbalken für body wiederherstellen
            // Exit fullscreen if active
            if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) { /* Safari */
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) { /* IE11 */
                    document.msExitFullscreen();
                }
            }
        }

        function advanceToNextPeriodDecisions() {
            hideNextPeriodTaskModal(); // Stoppt auch den Timer
            gameState.period++;
            document.getElementById('current-period').innerText = gameState.period;
            document.getElementById('period-results').classList.add('hidden');
            document.getElementById('show-next-period-task-button').classList.add('hidden');
            document.getElementById('show-group-results-button').classList.add('hidden');
            document.getElementById('period-decisions').classList.remove('hidden');
            isGameSavedSinceLastChange = false;
            setupPeriodInputs();
            saveStateToHistory(); // Save state for the new period (before decisions)
            autoSaveGame(); // Autosave after advancing to new period decisions
        }

        function endGame() {
            document.getElementById('game-in-progress').classList.add('hidden');
            document.getElementById('game-end').classList.remove('hidden');
            document.getElementById('show-next-period-task-button').classList.add('hidden');
            document.getElementById('show-group-results-button').classList.add('hidden');
            // document.getElementById('print-student-template-button').classList.add('hidden'); // Entfernt
            hideNextPeriodTaskModal(); hideInfo();

            const finalRankingDiv = document.getElementById('final-ranking');
            let rankingHTML = '<h3>Endgültige Rangliste:</h3><ol class="list-decimal list-inside mb-6">';
            const sortedGroups = [...gameState.groups].sort((a, b) => b.cumulativeProfit - a.cumulativeProfit);
            sortedGroups.forEach((group, index) => {
                rankingHTML += `<li class="mb-1">${index + 1}. ${group.name} - Kapital: ${formatCurrency(group.capital)} (Kumulierter Gewinn: ${formatCurrency(group.cumulativeProfit)})</li>`;
            });
            rankingHTML += '</ol>';
            finalRankingDiv.innerHTML = rankingHTML;

            // Diagramme erstellen (ENTFERNT)
        }


        function restartGame() {
            goToInitialSetup(); // goToInitialSetup already handles reset
        }

        function goToLastPeriodResults() {
            let lastResultsStateIndex = -1;
            for (let i = gameState.history.states.length - 1; i >= 0; i--) {
                if (gameState.history.states[i].period > 0 && gameState.history.states[i].marketSummary) {
                    lastResultsStateIndex = i; break;
                }
            }
            if (lastResultsStateIndex !== -1 && gameState.history.states[lastResultsStateIndex]) {
                const stateToLoad = gameState.history.states[lastResultsStateIndex];
                gameState.period = stateToLoad.period;
                gameState.groups = JSON.parse(JSON.stringify(stateToLoad.groups));
                gameState.lastPeriodMarketSummary = stateToLoad.marketSummary ? JSON.parse(JSON.stringify(stateToLoad.marketSummary)) : null;
                gameState.initialBaseDemand = stateToLoad.initialBaseDemand;
                document.getElementById('game-end').classList.add('hidden');
                document.getElementById('game-in-progress').classList.remove('hidden');
                document.getElementById('current-period').innerText = gameState.period;
                document.getElementById('period-decisions').classList.add('hidden');
                document.getElementById('machine-selection').classList.add('hidden');
                document.getElementById('period-results').classList.remove('hidden');
                // document.getElementById('print-student-template-button').classList.add('hidden'); // Entfernt
                hideNextPeriodTaskModal(); hideInfo();
                displayPeriodResults();
                lastPeriodStateIndex = lastResultsStateIndex;
                 isGameSavedSinceLastChange = false; // Zustand wurde geändert
            } else {
                showNotification("Keine vorherige Periode mit Ergebnissen verfügbar.");
                goToInitialSetup();
            }
        }

        function showInstructions(type) {
            const modal = document.getElementById('instructionsModal');
            const title = document.getElementById('instructions-title');
            const content = document.getElementById('instructions-content');
            let rndStudentText = '';
            let rndTeacherText = '';
            let rndCostText = '';
            if (FIXED_PARAMETERS.isRndEnabled) {
                rndStudentText = `<li class="mb-1"><strong>Forschung & Entwicklung (ab Periode 3):</strong> Möchten Sie Geld in F&E investieren? Kumulierte Investitionen von <strong>${formatCurrency(FIXED_PARAMETERS.rndBenefitThreshold)}</strong> führen zu einer permanenten Reduzierung der variablen Produktionskosten um <strong>${(FIXED_PARAMETERS.rndVariableCostReduction * 100).toFixed(1)}%</strong>.</li>`;
                rndTeacherText = `<li><strong>F&E Vorteil Schwelle:</strong> <strong id="param-rndBenefitThreshold-info">${formatCurrency(FIXED_PARAMETERS.rndBenefitThreshold)}</strong></li>
                                  <li><strong>F&E Kostenreduktion:</strong> <strong id="param-rndVariableCostReduction-info">${(FIXED_PARAMETERS.rndVariableCostReduction * 100).toFixed(1)}%</strong></li>`;
                rndCostText = `<li>F&E Investition: Der investierte Betrag pro Periode.</li>`;
            }


            if (type === 'student') {
                title.innerText = 'Anleitung für Gruppen';
                content.innerHTML = `
                    <p class="mb-3"><strong>Herzlich Willkommen bei Markt-Match 5, einem Wirtschaftsplanspiel für Einsteiger. Schlüpfen Sie in der Rolle der Geschäftsführung eines Produktionsunternehmens. Ihr Unternehmen produziert günstige Smartwatches für eine sehr junge Zielgruppe und möchte diese möglichst gewinnbringend verkaufen. Treffen Sie für Ihr Unternehmen die richtigen Entscheidungen, um die Konkurrenz am Markt auszustechen!</strong></p>
                    <h3 class="font-semibold mb-1">Ziel des Spiels</h3><p class="mb-3">Das Ziel ist es, am Ende des Spiels den höchsten kumulierten Gewinn unter allen Gruppen erwirtschaftet zu haben.</p>

                    <h3 class="font-semibold mb-1 mt-3">Erster Arbeitsauftrag: Unternehmensgründung und Vorstellung</h3>
                    <p class="mb-2">Bevor das eigentliche Spiel beginnt, gründet jede Gruppe ihr Unternehmen. Dies beinhaltet die Entwicklung eurer Unternehmensidentität und eine kurze Präsentation.</p>
                    <ol class="list-decimal list-outside mb-3" style="margin-left: 0; padding-left: 0;">
                        <li class="mb-1"><strong>Unternehmensname festlegen:</strong> Findet einen passenden Namen für euer Unternehmen, das günstige Smartwatches für junge Leute herstellt.</li>
                        <li class="mb-1"><strong>Gruppen-/Unternehmens-Plakat gestalten:</strong> Gestaltet ein Plakat, das eure Gruppe und euer Unternehmen präsentiert. Schreibt die Namen aller Gruppenmitglieder, den Unternehmensnamen (groß geschrieben) und erste Ideen für euer Produkt und Marketing auf. Legt das Plakat auf euren Gruppentisch.</li>
                        <div class="my-2 p-2 border border-gray-400 rounded" style="min-height: 40px; background-color: #f8f9fa;">Unser Unternehmensname: <input type="text" class="w-full p-2 border border-gray-300 rounded" style="background-color: #f8f9fa;"></div>
                        <li class="mb-1"><strong>Kurze Vorstellung:</strong> Jede Gruppe stellt ihr Plakat und Unternehmen kurz vor (ca. 1-2 Minuten).</li>
                        <li class="mb-1"><strong>Maschinenwahl:</strong> Entscheidet euch für eine der vier Produktionsmaschinen. Diese wählt ihr dann im System aus und könnt direkt mit Periode 1 starten.</li>
                    </ol>
                    <p class="mb-2">Ihr startet mit <strong>${formatCurrency(FIXED_PARAMETERS.startingCapital)}</strong> Startkapital und müsst euch für eine passende <strong>Produktionsmaschine</strong> entscheiden. Ihr habt dabei die Auswahl zwischen den folgenden Maschinen:</p>
                    <div class="mb-2 p-2 border border-gray-300 rounded-md bg-gray-50">
                        <label class="inline-flex items-center">
                            <input type="checkbox" class="form-checkbox h-4 w-4 text-blue-600" disabled>
                            <span class="ml-2 text-gray-700 text-sm"><strong>SmartMini-Fertiger:</strong> Preis: 5.000,00 € | max. Kapazität pro Periode: 100 Einheiten | Kosten: 6,00 € pro produzierter Einheit</span>
                        </label>
                    </div>
                    <div class="mb-2 p-2 border border-gray-300 rounded-md bg-gray-50">
                        <label class="inline-flex items-center">
                            <input type="checkbox" class="form-checkbox h-4 w-4 text-blue-600" disabled>
                            <span class="ml-2 text-gray-700 text-sm"><strong>KompaktPro-Produzent:</strong> Preis: 12.000,00 € | max. Kapazität pro Periode: 250 Einheiten | Kosten: 5,00 € pro produzierter Einheit</span>
                        </label>
                    </div>
                    <div class="mb-2 p-2 border border-gray-300 rounded-md bg-gray-50">
                        <label class="inline-flex items-center">
                            <input type="checkbox" class="form-checkbox h-4 w-4 text-blue-600" disabled>
                            <span class="ml-2 text-gray-700 text-sm"><strong>FlexiTech-Assembler:</strong> Preis: 18.000,00 € | max. Kapazität pro Periode: 350 Einheiten | Kosten: 4,50 € pro produzierter Einheit</span>
                        </label>
                    </div>
                    <div class="mb-3 p-2 border border-gray-300 rounded-md bg-gray-50">
                        <label class="inline-flex items-center">
                            <input type="checkbox" class="form-checkbox h-4 w-4 text-blue-600" disabled>
                            <span class="ml-2 text-gray-700 text-sm"><strong>MegaFlow-Manufaktur:</strong> Preis: 25.000,00 € | max. Kapazität pro Periode: 500 Einheiten | Kosten: 4,00 € pro produzierter Einheit</span>
                        </label>
                    </div>
                    <p class="mb-3 font-bold text-center text-6xl w-full">Regeln auf der Rückseite beachten</p>
                    <!-- PAGE BREAK -->
                    <div class="page-break"></div>
                    <!-- CONTENT FOR BACK SIDE -->
                    <h3 class="font-semibold mb-1 mt-3">Spielregeln:</h3>
                    <h4 class="font-semibold mb-1 mt-2">Ablauf pro Periode (ab Periode 1)</h4>
                    <p class="mb-2">In jeder Periode entscheiden die Gruppen über:</p>
                    <ul class="list-disc list-inside ml-4 mb-2">
                        <li class="mb-1"><strong>Produktion:</strong> Wie viele Smartwatches wollen wir produzieren? Begrenzt durch Ihre Maschinenkapazität. Die hier festgelegte Produktionsmenge wird (zusammen mit Einheiten aus dem Lager, falls gewählt) vollständig in der aktuellen Periode zum festgelegten Preis am Markt angeboten. ${FIXED_PARAMETERS.machineDegradationRate > 0 ? `Beachten Sie, dass die Kapazität Ihrer Maschinen pro Periode um ${(FIXED_PARAMETERS.machineDegradationRate * 100).toFixed(0)}% abnimmt.` : ''}</li>
                        <li class="mb-1"><strong>Verkaufen aus Lagerbestand:</strong> Wie viele Smartwatches möchten Sie aus Ihrem aktuellen Lagerbestand verkaufen?</li>
                        <li class="mb-1"><strong>Preis:</strong> Zu welchem Preis pro Einheit bieten wir unsere Smartwatches auf dem Markt an?</li>
                        <li class="mb-1"><strong>Marketing Bemühung (nur Periode 5):</strong> Ihre Marketing-Bewertung (1-10) durch die Spielleitung kann Ihren Absatzanteil positiv beeinflussen, wenn Sie preislich mit anderen Anbietern gleichauf liegen. Es entstehen keine direkten Kosten für diese Bemühung.</li>
                        <li class="mb-1"><strong>Marktanalyse:</strong> Kaufen wir eine Marktanalyse für <strong>${formatCurrency(FIXED_PARAMETERS.marketAnalysisCost)}</strong>, um detaillierte Infos über Konkurrenz und Markt der letzten Periode zu erhalten?</li>
                        ${rndStudentText}
                    </ul>
                    <p class="mb-2">Zusätzliche Maschinen können Sie nach Periode 3 kaufen, danach wieder in Periode 6, 9, etc. (alle 3 Perioden).</p>
                    <h4 class="font-semibold mb-1 mt-2">Marktmechanismus</h4>
                    <p class="mb-2">Die Marktnachfrage wird in jeder Periode neu berechnet und reagiert auf den <strong>Preis aller angebotenen Smartwatches:</strong> Wenn der durchschnittliche Preis aller Gruppen steigt, sinkt die Gesamtnachfrage am Markt. Wenn der Preis sinkt, steigt die Nachfrage.</p>
                    <ul class="list-disc list-inside ml-4 mb-2">
                        <li>Die Gruppen mit den **günstigsten Preisen** verkaufen zuerst.</li>
                        <li>Bei gleichem Preis wird die verbleibende Nachfrage unter den Anbietern zu diesem Preis aufgeteilt. Nicht verkaufte Produktion wird automatisch dem Lagerbestand hinzugefügt. Einheiten aus dem Lagerbestand können in späteren Perioden verkauft werden.</li>
                    </ul>
                    <h4 class="font-semibold mb-1 mt-2">Kosten</h4>
                    <ul class="list-disc list-inside ml-4 mb-2">
                        <li>Variable Produktionskosten: Abhängig vom Maschinentyp, pro produziertem Smartwatch.</li>
                        <li>Lagerkosten: <strong>${formatCurrency(FIXED_PARAMETERS.inventoryCostPerUnit)}</strong> pro Smartwatch im Lager am Ende der Periode.</li>
                        <li>Marktanalyse Kosten: <strong>${formatCurrency(FIXED_PARAMETERS.marketAnalysisCost)}</strong> pro Periode, falls gekauft.</li>
                        ${rndCostText}
                        <li>Zinskosten: Bei negativem Kontostand zahlen Sie <strong>${(FIXED_PARAMETERS.negativeCashInterestRate * 100).toFixed(1)}%</strong> Zinsen auf den negativen Betrag.</li>
                        <li>Maschinenkauf: Einmalige Kosten beim Kauf einer Maschine.</li>
                    </ul>
                    <h4 class="font-semibold mb-1 mt-2">Kontostand und Negativsaldo</h4>
                    <p class="mb-2">Sie können keinen Kredit aufnehmen. Ihr Kontostand kann jedoch ins Minus gehen. Wenn Ihr Kontostand am Ende einer Periode negativ ist, zahlen Sie Zinsen.</p>
                    ${FIXED_PARAMETERS.isRndEnabled ? `<h4 class="font-semibold mb-1 mt-2">Forschung & Entwicklung</h4><p>Investitionen in F&E werden kumuliert. Ab einer kumulierten Investition von <strong>${formatCurrency(FIXED_PARAMETERS.rndBenefitThreshold)}</strong> führen zu einer permanenten Reduzierung der variablen Produktionskosten um <strong>${(FIXED_PARAMETERS.rndVariableCostReduction * 100).toFixed(1)}%</strong>.</p>` : ''}`;
            } else if (type === 'teacher') {
                title.innerText = 'Anleitung für Spielleitung';
                content.innerHTML = `
                    <h3 class="font-semibold mb-2">Übersicht und Steuerung</h3>
                    <p>Diese Anwendung dient als Plattform zur Durchführung des Wirtschafts-Planspiels "Markt-Match 5", bei dem Gruppen günstige Smartwatches für eine junge Zielgruppe produzieren und verkaufen. Sie legen die Anzahl der teilnehmenden Gruppen fest und können die Spielanleitungen sowie Einstellungen verwalten.</p>
                     <h3 class="font-semibold mb-2 mt-4">Technische Voraussetzungen (Empfehlung)</h3>
                    <ul class="list-disc list-inside ml-4 mb-3">
                        <li>Ein Computer mit Internetzugang und einem aktuellen Webbrowser (z.B. Chrome, Firefox, Edge) für die Spielleitung.</li>
                        <li>Ein Beamer oder ein großer Bildschirm, um ggf. Ergebnisse oder den Timer für alle sichtbar zu machen.</li>
                        <li>Ein Drucker, um die Schülervorlagen und ggf. die Gruppenergebnisse auszudrucken.</li>
			<li>DIN A3 Plakate und Stifte für jede Gruppe.</li>
                       
                    </ul>

                    <h3 class="font-semibold mb-2 mt-4">Spielphasen</h3>
                    <ol>
                        <li><strong>Initiales Setup:</strong>
                            <ul>
                                <li>Legen Sie die Anzahl der Gruppen (2-10) und deren Namen fest.</li>
                                <li>Drucken Sie die Schülervorlagen aus.</li>
                                <li>Passen Sie bei Bedarf die Spielparameter über "Einstellungen" an (inkl. Aktivierung/Deaktivierung von F&E).</li>
                            </ul>
                        </li>
                        <li><strong>Maschinenauswahl (Periode 0):</strong>
                            <ul>
                                <li>Jede Gruppe wählt ihre erste Maschine basierend auf dem Startkapital.</li>
                                <li>Geben Sie die Auswahl in der Anwendung ein und starten Sie das Spiel.</li>
                            </ul>
                        </li>
                        <li><strong>Perioden (ab Periode 1):</strong>
                            <ul>
                                <li>Sammeln Sie die Entscheidungen der Gruppen (Produktion, Preis, etc.). Die produzierte Menge wird direkt am Markt angeboten.</li>
                                <li>Beachten Sie spezielle Regeln für Marketing (Periode 5 - beeinflusst Absatzanteil), F&E (ab Periode 3, falls aktiviert) und Maschinenkauf (ab Periode 3, dann alle 3 Perioden).</li>
                                <li>Geben Sie die Entscheidungen ein und simulieren Sie die Periode.</li>
                                <li>Zeigen Sie die Ergebnisse (Gesamtmarkt und pro Gruppe) an und drucken Sie diese bei Bedarf.</li>
                                <li>Nutzen Sie die Marktanalyse, falls von Gruppen gekauft.</li>
                                <li>Bereiten Sie die nächste Periode über den entsprechenden Button vor.</li>
                            </ul>
                        </li>
                        <li><strong>Zurücksetzen und Korrektur:</strong>
                            <ul>
                                <li>Sie können das Spiel auf eine frühere Periode zurücksetzen.</li>
                                <li>Manuelle Korrekturen von Kapital, Lagerbestand etc. sind möglich (F&E-Felder nur wenn F&E aktiviert).</li>
                            </ul>
                        </li>
                        <li><strong>Spielende:</strong>
                            <ul>
                                <li>Beenden Sie das Spiel, um die finale Rangliste anzuzeigen.</li>
                                <li>Ein Neustart oder die Rückkehr zur letzten Periode ist möglich.</li>
                            </ul>
                        </li>
                    </ol>

                    <h3 class="font-semibold mb-2 mt-4">Wichtige Spielparameter (Standardwerte, änderbar)</h3>
                    <ul>
                        <li>Startkapital: <strong id="param-startingCapital-info">${formatCurrency(FIXED_PARAMETERS.startingCapital)}</strong></li>
                        <li>Kosten Marktanalyse: <strong id="param-marketAnalysisCost-info">${formatCurrency(FIXED_PARAMETERS.marketAnalysisCost)}</strong></li>
                        <li>Zinssatz Negativsaldo: <strong id="param-negativeCashInterestRate-info">${(FIXED_PARAMETERS.negativeCashInterestRate * 100).toFixed(1)}%</strong></li>
                        ${rndTeacherText}
                        <li>Lagerkosten pro Einheit: <strong id="param-inventoryCostPerUnit-info">${formatCurrency(FIXED_PARAMETERS.inventoryCostPerUnit)}</strong></li>
                        <li>Maschinen Kapazitätsverlust Rate: <strong id="param-machineDegradationRate-info">${(FIXED_PARAMETERS.machineDegradationRate * 100).toFixed(0)}%</strong></li>
                        <li>F&E aktiviert: <strong id="param-isRndEnabled-info">${FIXED_PARAMETERS.isRndEnabled ? 'Ja' : 'Nein'}</strong></li>
                        <li>Initialer Marktsättigungsfaktor: <strong id="param-initialMarketSaturationFactor-info">${(FIXED_PARAMETERS.initialMarketSaturationFactor * 100).toFixed(0)}%</strong></li>
                        <li>Minimaler Nachfragemultiplikator (Preiselastizität): <strong>${(FIXED_PARAMETERS.minPriceElasticityDemandMultiplier * 100).toFixed(0)}%</strong></li>
                        <li>Marketing-Effektivitätsfaktor: <strong>${(FIXED_PARAMETERS.marketingEffectivenessFactor * 100).toFixed(0)}% pro Punkt</strong></li>
                        <li>Timer-Dauer Arbeitsauftrag: <strong>${FIXED_PARAMETERS.timerDurationMinutes} Minuten</strong></li>
                        <li>Tooltips anzeigen: <strong id="param-areTooltipsEnabled-info">${FIXED_PARAMETERS.areTooltipsEnabled ? 'Ja' : 'Nein'}</strong></li>
                    </ul>
                    <p>Weitere Parameter wie Maschinenkonfigurationen und Nachfragefaktoren sind ebenfalls in den Einstellungen anpassbar.</p>

                    <h3 class="font-semibold mb-2 mt-4">Marktmechanismus</h3>
                    <p>Die Nachfrage hängt vom Durchschnittspreis ab. Günstigste Anbieter verkaufen zuerst, bei Preisgleichheit proportional zur (ggf. marketing-gewichteten) Menge.</p>`;
            }
            modal.style.display = 'block';
        }
        function hideInstructions() { document.getElementById('instructionsModal').style.display = 'none'; }

        function printInstructions() {
            const instructionsContent = document.getElementById('instructions-content').innerHTML;
            const instructionsTitle = document.getElementById('instructions-title').innerText;
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.open();
                printWindow.document.write(`
                    <!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>${instructionsTitle}</title>
                    <style>
                        body { font-family: 'Inter', sans-serif; line-height: 1.5; padding: 20px; color: #333; font-size: 10pt; } /* Etwas größere Schrift für Druck */
                        h2, h3, h4 { color: #0A2540; margin-top: 1em; margin-bottom: 0.5em; }
                        h2 { border-bottom: 1px solid #ccc; padding-bottom: 0.3em; font-size: 1.4em; }
                        h3 { font-size: 1.2em; }
                        h4 { font-size: 1.1em; }
                        ul, ol { list-style-position: outside; margin-left: 1.5em; margin-bottom: 0.8em; }
                        li { margin-bottom: 0.3em; }
                        p { margin-bottom: 0.8em; }
                        .my-2 { margin-top: 0.5rem; margin-bottom: 0.5rem; }
                        .p-2 { padding: 0.5rem; }
                        .border { border: 1px solid #ccc; }
                        .border-gray-400 { border-color: #cbd5e0; }
                        .rounded { border-radius: 0.25rem; }
                        .bg-gray-50, .bg-gray-100, #f8f9fa /* für die Eingabebox */ { background-color: #f9fafb !important; } /* Helltöne für Druck beibehalten */
                        @media print { button { display: none; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } } /* Stellt sicher, dass Hintergrundfarben gedruckt werden */
                        .page-break { page-break-before: always !important; height:0; display:block; } /* Hinzugefügt für Druck der Anleitung */
                    </style></head><body><h2>${instructionsTitle}</h2>${instructionsContent}</body></html>`);
                printWindow.document.close();
                printWindow.print();
            } else {
                showNotification("Das Druckfenster konnte nicht geöffnet werden. Bitte Pop-ups erlauben.");
            }
        }


        window.onclick = function(event) {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (event.target === modal) {
                    if (modal.id === 'instructionsModal') hideInstructions();
                    else if (modal.id === 'resetModal') hideResetToPeriod();
                    else if (modal.id === 'manualCorrectionModal') hideManualCorrection();
                    else if (modal.id === 'groupResultsModal') hideGroupResultsModal();
                    else if (modal.id === 'nextPeriodTaskModal') hideNextPeriodTaskModal();
                    else if (modal.id === 'settingsModal') hideSettingsModal();
                    else if (modal.id === 'supportingMaterialMenuModal') hideSupportingMaterialMenuModal();
                    else if (modal.id === 'vorstellungsrundeModal') hideVorstellungsrundeModal();
                    else if (modal.id === 'marketingConceptModal') hideMarketingConceptModal();
                    else if (modal.id === 'reflectionPhasesModal') hideReflectionPhasesModal();
                    else if (modal.id === 'glossaryModal') hideGlossaryModal();
                    else if (modal.id === 'kennenlernspieleModal') hideKennenlernspieleModal();
                    else if (modal.id === 'autoSaveModal') discardAutoSave(); // Schließt auch bei Klick daneben
                }
            });
        }
        function ensureValidFixedParameters(callingFunction = "unknown") {
            if (!FIXED_PARAMETERS || typeof FIXED_PARAMETERS !== 'object' || !FIXED_PARAMETERS.machines || typeof FIXED_PARAMETERS.machines !== 'object' || Object.keys(FIXED_PARAMETERS.machines).length === 0) {
                console.error(`CRITICAL ERROR in ${callingFunction}: FIXED_PARAMETERS or .machines is invalid or empty. Reinitializing to easy preset. Current FIXED_PARAMETERS:`, JSON.stringify(FIXED_PARAMETERS));
                FIXED_PARAMETERS = JSON.parse(JSON.stringify(parameterPresets.easy));
                DEFAULT_PARAMETERS = JSON.parse(JSON.stringify(FIXED_PARAMETERS)); // Sync default as well
                showNotification("Spielparameter waren ungültig und wurden auf 'Einfacher Markt' zurückgesetzt.", "error", 7000);
                if (typeof updateDynamicUITexts === "function" && updateDynamicUITexts !== ensureValidFixedParameters) { // Avoid recursion if called from itself
                    updateDynamicUITexts();
                }
                return false; // Indicate that parameters were invalid
            }
            return true; // Indicate that parameters are valid
        }


        function showSettingsModal() {
            ensureValidFixedParameters("showSettingsModal");
            const settingsModal = document.getElementById('settingsModal');
            const settingsInputsDiv = document.getElementById('settings-inputs');
            settingsInputsDiv.innerHTML = ''; // Clear previous inputs first

            // Dropdown für Presets
            const presetFormGroup = document.createElement('div');
            presetFormGroup.classList.add('form-group');
            presetFormGroup.innerHTML = `
                <label for="market-setting-preset">Markt-Setting Voreinstellung:</label>
                <select id="market-setting-preset" class="mb-4">
                    <option value="manual">Manuell/Benutzerdefiniert</option>
                    <option value="easy">Einfacher Markt</option>
                    <option value="medium">Mittlerer Markt</option>
                    <option value="hard">Schwieriger Markt</option>
                </select>
            `;
            settingsInputsDiv.appendChild(presetFormGroup);

            const presetSelect = document.getElementById('market-setting-preset');
            presetSelect.addEventListener('change', function() {
                const selectedPresetKey = this.value;
                if (parameterPresets[selectedPresetKey]) {
                    FIXED_PARAMETERS = JSON.parse(JSON.stringify(parameterPresets[selectedPresetKey]));
                    populateSettingsInputs(); // Füllt die einzelnen Felder neu
                    updateDynamicUITexts();
                }
            });

            // Container für die einzelnen Parameter-Felder
            const parameterFieldsContainer = document.createElement('div');
            parameterFieldsContainer.id = 'parameter-fields-container';
            settingsInputsDiv.appendChild(parameterFieldsContainer);

            populateSettingsInputs(); // Füllt die Felder initial


            const machinesInfo = document.createElement('p');
            machinesInfo.classList.add('text-sm', 'text-gray-600', 'dark:text-gray-400', 'mt-4');
            machinesInfo.innerHTML = `<strong>Maschinenparameter:</strong> Die Kosten, Kapazitäten und variablen Kosten der Maschinen können hier nicht direkt geändert werden. Sie werden aus dem <code>FIXED_PARAMETERS.machines</code> Objekt im Code geladen.`;
            settingsInputsDiv.appendChild(machinesInfo);


            const darkModeToggle = document.getElementById('dark-mode-toggle');
            darkModeToggle.checked = document.body.classList.contains('dark-mode');
            darkModeToggle.onchange = toggleDarkMode;

            updatePresetDropdownSelection(); // Stellt sicher, dass das Dropdown den aktuellen Zustand widerspiegelt
            settingsModal.style.display = 'block';
        }

        function populateSettingsInputs() {
            ensureValidFixedParameters("populateSettingsInputs");

            const parameterFieldsContainer = document.getElementById('parameter-fields-container');
            if (!parameterFieldsContainer) {
                console.error("parameter-fields-container not found in populateSettingsInputs");
                return;
            }
            parameterFieldsContainer.innerHTML = ''; // Clear previous parameter fields

            const settingOrder = [
                'isRndEnabled', 'timerDurationMinutes', 'areTooltipsEnabled',
                'startingCapital', 'marketAnalysisCost', 'negativeCashInterestRate',
                'initialMarketSaturationFactor', 'priceElasticityFactor', 'demandReferencePrice',
                'minPriceElasticityDemandMultiplier', 'inventoryCostPerUnit', 'rndBenefitThreshold',
                'rndVariableCostReduction', 'machineDegradationRate', 'marketingEffectivenessFactor'
            ];

            settingOrder.forEach(key => {
                if (FIXED_PARAMETERS.hasOwnProperty(key) && typeof FIXED_PARAMETERS[key] !== 'object') { // Exclude 'machines' object
                     const paramValue = FIXED_PARAMETERS[key];
                    const tooltip = tooltips[key];
                    const formGroupDiv = document.createElement('div');
                    formGroupDiv.classList.add('form-group');
                    let inputHtml = '';
                    let labelText = tooltip ? tooltip.title : key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

                    if (typeof paramValue === 'boolean') {
                        inputHtml = `<input type="checkbox" id="setting-${key}" ${paramValue ? 'checked' : ''}>`;
                    } else if (typeof paramValue === 'number') {
                        const step = (key.includes('Rate') || key.includes('Factor') || key.includes('Reduction') || key === 'inventoryCostPerUnit' || key === 'initialMarketSaturationFactor' || key === 'minPriceElasticityDemandMultiplier' || key === 'marketingEffectivenessFactor') ? "0.01" : "1.00";
                         if (key === 'timerDurationMinutes') {
                             inputHtml = `<input type="number" id="setting-${key}" value="${paramValue}" min="1" step="1">`;
                         } else {
                            inputHtml = `<input type="number" id="setting-${key}" value="${paramValue.toFixed(2)}" step="${step}">`;
                         }
                    } else {
                        inputHtml = `<input type="text" id="setting-${key}" value="${paramValue}">`;
                    }
                    formGroupDiv.innerHTML = `<label for="setting-${key}">${labelText}:</label>${inputHtml}${tooltip ? `<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${tooltip.text}</p>` : ''}`;
                    parameterFieldsContainer.appendChild(formGroupDiv);
                }
            });
            updatePresetDropdownSelection();
        }

        function updatePresetDropdownSelection() {
            const presetSelect = document.getElementById('market-setting-preset');
            if (!presetSelect) return;
            ensureValidFixedParameters("updatePresetDropdownSelection");


            let currentMatchesPreset = "manual";
            for (const presetName in parameterPresets) {
                let match = true;
                for(const key in parameterPresets[presetName]) {
                    if (key !== 'machines' && FIXED_PARAMETERS[key] !== parameterPresets[presetName][key]) { // Maschinenobjekt nicht direkt vergleichen
                        match = false;
                        break;
                    }
                }
                if (match) {
                    const fixedKeys = Object.keys(FIXED_PARAMETERS).filter(k => k !== 'machines');
                    const presetKeys = Object.keys(parameterPresets[presetName]).filter(k => k !== 'machines');
                    if (fixedKeys.length === presetKeys.length) { // Ensure no extra keys in FIXED_PARAMETERS
                        currentMatchesPreset = presetName;
                        break;
                    }
                }
            }
            presetSelect.value = currentMatchesPreset;
        }


        function hideSettingsModal() { document.getElementById('settingsModal').style.display = 'none'; }

        function saveSettings() {
            let settingsValid = true;
            ensureValidFixedParameters("saveSettings_start");

            const settingKeys = [
                'isRndEnabled', 'timerDurationMinutes', 'areTooltipsEnabled',
                'startingCapital', 'marketAnalysisCost', 'negativeCashInterestRate',
                'initialMarketSaturationFactor', 'priceElasticityFactor', 'demandReferencePrice',
                'minPriceElasticityDemandMultiplier', 'inventoryCostPerUnit', 'rndBenefitThreshold',
                'rndVariableCostReduction', 'machineDegradationRate', 'marketingEffectivenessFactor'
            ];

            settingKeys.forEach(key => {
                if (FIXED_PARAMETERS.hasOwnProperty(key) && typeof FIXED_PARAMETERS[key] !== 'object') { // Exclude 'machines'
                    const inputElement = document.getElementById(`setting-${key}`);
                    if (inputElement) {
                        if (typeof FIXED_PARAMETERS[key] === 'boolean') {
                            FIXED_PARAMETERS[key] = inputElement.checked;
                        } else if (typeof FIXED_PARAMETERS[key] === 'number') {
                            const value = parseFloat(inputElement.value);
                            if (!isNaN(value)) {
                                FIXED_PARAMETERS[key] = value;
                                if (key === 'timerDurationMinutes' && value < 1) {
                                    showNotification("Timer-Dauer muss mindestens 1 Minute sein.");
                                    settingsValid = false;
                                }
                            } else {
                                showNotification(`Ungültiger Wert für ${tooltips[key]?.title || key}. Bitte geben Sie eine Zahl ein.`);
                                settingsValid = false;
                            }
                        } else { // string
                            FIXED_PARAMETERS[key] = inputElement.value;
                        }
                    }
                }
            });


            if (!settingsValid) return;

            DEFAULT_PARAMETERS = JSON.parse(JSON.stringify(FIXED_PARAMETERS)); // "Reset to Default" wird zum aktuell gespeicherten Zustand
            updateDynamicUITexts(); // Aktualisiert Tooltips etc. mit neuen Werten
            savePreferences();
            showNotification("Einstellungen gespeichert!", 'success');
            hideSettingsModal();

            if (document.getElementById('instructionsModal').style.display === 'block') {
                const currentType = document.getElementById('instructions-title').innerText.includes('Gruppen') ? 'student' : 'teacher';
                showInstructions(currentType);
            }
            if (!document.getElementById('period-decisions').classList.contains('hidden')) {
                 setupPeriodInputs(); // Re-render period inputs to reflect new costs and F&E status
            }
            updatePresetDropdownSelection(); // Nach dem Speichern das Dropdown aktualisieren
        }

        // Supporting Material Modals
        function showSupportingMaterialMenuModal() { document.getElementById('supportingMaterialMenuModal').style.display = 'block'; }
        function hideSupportingMaterialMenuModal() { document.getElementById('supportingMaterialMenuModal').style.display = 'none'; }
        function showVorstellungsrundeModal() { hideSupportingMaterialMenuModal(); document.getElementById('vorstellungsrundeModal').style.display = 'block'; }
        function hideVorstellungsrundeModal() { document.getElementById('vorstellungsrundeModal').style.display = 'none'; }
        function showMarketingConceptModal() { hideSupportingMaterialMenuModal(); document.getElementById('marketingConceptModal').style.display = 'block'; }
        function hideMarketingConceptModal() { document.getElementById('marketingConceptModal').style.display = 'none'; }
        function showReflectionPhasesModal() { hideSupportingMaterialMenuModal(); document.getElementById('reflectionPhasesModal').style.display = 'block'; }
        function hideReflectionPhasesModal() { document.getElementById('reflectionPhasesModal').style.display = 'none'; }
        function showGlossaryModal() { hideSupportingMaterialMenuModal(); document.getElementById('glossaryModal').style.display = 'block'; }
        function hideGlossaryModal() { document.getElementById('glossaryModal').style.display = 'none'; }
        function showKennenlernspieleModal() { hideSupportingMaterialMenuModal(); document.getElementById('kennenlernspieleModal').style.display = 'block'; }
        function hideKennenlernspieleModal() { document.getElementById('kennenlernspieleModal').style.display = 'none'; }


        function printModalContent(modalId) {
            const modal = document.getElementById(modalId);
            if (!modal) return;
            const title = modal.querySelector('h2').innerText;
            const contentDiv = modal.querySelector('.modal-content > div[id$="-content"]'); // More specific selector
            const content = contentDiv ? contentDiv.innerHTML : 'Kein Inhalt gefunden.';


            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.open();
                printWindow.document.write(`
                    <!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>${title}</title>
                    <style>
                        body { font-family: 'Inter', sans-serif; line-height: 1.6; padding: 20px; color: #333; }
                        h2, h3, h4 { color: #0A2540; margin-top: 20px; margin-bottom: 10px; }
                        h2 { border-bottom: 2px solid #E2E8F0; padding-bottom: 10px; }
                        ul { list-style: disc; margin-left: 20px; margin-bottom: 20px; }
                        ul li { margin-bottom: 5px; }
                        dl dt { font-weight: bold; margin-top: 0.75em;}
                        dl dd { margin-left: 1.5em; margin-bottom: 0.5em;}
                        .print-button { display: none; } /* Hide print button in print view */
                    </style></head><body><h2>${title}</h2>${content}</body></html>`);
                printWindow.document.close();
                printWindow.print();
            } else {
                showNotification("Das Druckfenster konnte nicht geöffnet werden. Bitte Pop-ups erlauben.");
            }
        }


        function toggleDarkMode() {
            document.body.classList.toggle('dark-mode');
            savePreferences();
        }
        function savePreferences() {
            localStorage.setItem('marktMatchPreferences', JSON.stringify({
                darkMode: document.body.classList.contains('dark-mode'),
                areTooltipsEnabled: FIXED_PARAMETERS.areTooltipsEnabled, // Tooltip-Einstellung mitspeichern
                // showTutorialOnLoad: FIXED_PARAMETERS.showTutorialOnLoad // Tutorial-Einstellung entfernt
            }));
        }
        function loadPreferences() {
            const preferences = JSON.parse(localStorage.getItem('marktMatchPreferences'));
            if (preferences) {
                if (preferences.darkMode) {
                    document.body.classList.add('dark-mode');
                    const darkModeToggle = document.getElementById('dark-mode-toggle');
                    if(darkModeToggle) darkModeToggle.checked = true;
                }
                if (preferences.areTooltipsEnabled !== undefined) { // Lade Tooltip-Einstellung
                    FIXED_PARAMETERS.areTooltipsEnabled = preferences.areTooltipsEnabled;
                }
                // FIXED_PARAMETERS.showTutorialOnLoad wurde entfernt, daher auch hier auskommentieren/entfernen
                // if (preferences.showTutorialOnLoad !== undefined) {
                //     FIXED_PARAMETERS.showTutorialOnLoad = preferences.showTutorialOnLoad;
                // }
            }
        }

        

        // --- Save and Load Game Functionality ---
        const AUTOSAVE_KEY = 'marktMatchAutoSave';

        function autoSaveGame() {
            if (typeof gameState !== 'undefined' && Object.keys(gameState).length > 0 && gameState.period >= 0) { // Autosave nur wenn Spiel läuft
                try {
                    const gameDataToSave = {
                        gameState: gameState,
                        fixedParameters: FIXED_PARAMETERS,
                        numberOfGroups: numberOfGroups,
                        lastPeriodStateIndex: lastPeriodStateIndex,
                        timestamp: new Date().toISOString() // Zeitstempel für den Autosave
                    };
                    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(gameDataToSave));
                    console.log("Spiel automatisch gespeichert um", new Date().toLocaleTimeString());
                    isGameSavedSinceLastChange = true;
                } catch (error) {
                    console.error("Fehler beim automatischen Speichern des Spiels:", error);
                    showNotification("Fehler beim automatischen Speichern.");
                }
            }
        }

        function loadAutoSavedGame() {
            const autoSavedDataString = localStorage.getItem(AUTOSAVE_KEY);
            if (autoSavedDataString) {
                try {
                    const loadedData = JSON.parse(autoSavedDataString);
                    if (loadedData.gameState && loadedData.fixedParameters && loadedData.numberOfGroups !== undefined) {
                        // Überprüfe und korrigiere FIXED_PARAMETERS
                        if (loadedData.fixedParameters && typeof loadedData.fixedParameters === 'object' && loadedData.fixedParameters.machines && typeof loadedData.fixedParameters.machines === 'object' && Object.keys(loadedData.fixedParameters.machines).length > 0) {
                            FIXED_PARAMETERS = loadedData.fixedParameters;
                            const defaultPreset = parameterPresets.easy;
                            for (const key in defaultPreset) {
                                if (!FIXED_PARAMETERS.hasOwnProperty(key)) {
                                    FIXED_PARAMETERS[key] = defaultPreset[key];
                                } else if (key === 'machines' && (typeof FIXED_PARAMETERS.machines !== 'object' || Object.keys(FIXED_PARAMETERS.machines).length === 0)) {
                                    FIXED_PARAMETERS.machines = JSON.parse(JSON.stringify(defaultPreset.machines));
                                }
                            }
                            for (const machineKey in defaultPreset.machines) {
                                if (!FIXED_PARAMETERS.machines.hasOwnProperty(machineKey) || typeof FIXED_PARAMETERS.machines[machineKey] !== 'object') {
                                    FIXED_PARAMETERS.machines[machineKey] = JSON.parse(JSON.stringify(defaultPreset.machines[machineKey]));
                                }
                            }
                        } else {
                            FIXED_PARAMETERS = JSON.parse(JSON.stringify(parameterPresets.easy));
                        }
                        DEFAULT_PARAMETERS = JSON.parse(JSON.stringify(FIXED_PARAMETERS));
                        gameState = loadedData.gameState;
                        gameState.parameters = FIXED_PARAMETERS; // Wichtig!

                        numberOfGroups = loadedData.numberOfGroups;
                        lastPeriodStateIndex = loadedData.lastPeriodStateIndex;

                        document.getElementById('initial-setup').classList.add('hidden');
                        document.getElementById('game-in-progress').classList.remove('hidden');
                        document.getElementById('game-end').classList.add('hidden');
                        document.getElementById('current-period').innerText = gameState.period;

                        updateDynamicUITexts();
                        updatePresetDropdownSelection();

                        if (gameState.period === 0 && !gameState.lastPeriodMarketSummary) { // Vor Maschinenauswahl
                            setupMachineSelection();
                        } else if (gameState.lastPeriodMarketSummary) { // Nach einer abgeschlossenen Periode
                            document.getElementById('machine-selection').classList.add('hidden');
                            document.getElementById('period-decisions').classList.add('hidden');
                            document.getElementById('period-results').classList.remove('hidden');
                            document.getElementById('results-period-number').innerText = gameState.period;
                            const supportingMaterialBtnIngame = document.getElementById('supporting-material-button-ingame');
                            if (supportingMaterialBtnIngame) supportingMaterialBtnIngame.classList.remove('hidden');
                            displayPeriodResults();
                        } else { // In der Entscheidungsphase einer Periode > 0
                            document.getElementById('machine-selection').classList.add('hidden');
                            document.getElementById('period-results').classList.add('hidden');
                            document.getElementById('period-decisions').classList.remove('hidden');
                            const supportingMaterialBtnIngame = document.getElementById('supporting-material-button-ingame');
                            if (supportingMaterialBtnIngame) supportingMaterialBtnIngame.classList.remove('hidden');
                            setupPeriodInputs();
                        }
                        showNotification("Automatisch gespeicherter Spielstand geladen!", "success");
                        isGameSavedSinceLastChange = true;
                    } else {
                        showNotification("Fehler beim Laden des Autosaves: Ungültige Datenstruktur.");
                    }
                } catch (error) {
                    console.error("Fehler beim Laden des automatisch gespeicherten Spiels:", error);
                    showNotification("Fehler beim Laden des Autosaves.");
                } finally {
                    localStorage.removeItem(AUTOSAVE_KEY);
                    hideAutoSaveModal();
                }
            }
        }

        function discardAutoSave() {
            localStorage.removeItem(AUTOSAVE_KEY);
            hideAutoSaveModal();
            showNotification("Automatisch gespeicherter Spielstand verworfen.", "success", 3000);
        }

        function showAutoSaveModal(timestamp) {
            const modal = document.getElementById('autoSaveModal');
            const timestampP = document.getElementById('autoSaveTimestamp');
            const date = new Date(timestamp);
            timestampP.textContent = `Es wurde ein automatisch gespeicherter Spielstand vom ${date.toLocaleDateString('de-DE')} um ${date.toLocaleTimeString('de-DE')} Uhr gefunden.`;
            modal.style.display = 'block';
        }

        function hideAutoSaveModal() {
            document.getElementById('autoSaveModal').style.display = 'none';
        }


        function saveGameToFile() {
            if (typeof gameState !== 'undefined' && Object.keys(gameState).length > 0) {
                try {
                    const gameDataToSave = {
                        gameState: gameState,
                        fixedParameters: FIXED_PARAMETERS,
                        numberOfGroups: numberOfGroups,
                        lastPeriodStateIndex: lastPeriodStateIndex
                    };
                    const jsonData = JSON.stringify(gameDataToSave, null, 2); // null, 2 for pretty printing
                    const blob = new Blob([jsonData], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    a.download = `markt-match-5-spielstand-${timestamp}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    isGameSavedSinceLastChange = true;
                    showNotification("Spielstand erfolgreich als Datei gespeichert!", "success");
                } catch (error) {
                    console.error("Fehler beim Speichern des Spiels:", error);
                    showNotification("Fehler beim Speichern des Spiels.");
                }
            } else {
                showNotification("Kein aktives Spiel zum Speichern vorhanden.");
            }
        }

        function loadGameFromFile() {
            const fileInput = document.getElementById('load-game-input');
            if (!fileInput.files.length) {
                showNotification("Bitte wählen Sie eine Speicherdatei aus.");
                return;
            }
            const file = fileInput.files[0];
            const reader = new FileReader();

            reader.onload = function(event) {
                try {
                    const loadedData = JSON.parse(event.target.result);
                    if (loadedData.gameState && loadedData.numberOfGroups !== undefined) { // fixedParameters kann optional sein

                        if (loadedData.fixedParameters && typeof loadedData.fixedParameters === 'object' && loadedData.fixedParameters.machines && typeof loadedData.fixedParameters.machines === 'object' && Object.keys(loadedData.fixedParameters.machines).length > 0) {
                            FIXED_PARAMETERS = loadedData.fixedParameters;
                            // Ensure all expected keys from parameterPresets.easy are present,
                            // especially for top-level parameters and the machines object structure.
                            const defaultPreset = parameterPresets.easy; // Use easy as the base for missing keys
                            for (const key in defaultPreset) {
                                if (key === 'machines') { // Special handling for machines object
                                    if (!FIXED_PARAMETERS.machines || typeof FIXED_PARAMETERS.machines !== 'object' || Object.keys(FIXED_PARAMETERS.machines).length === 0) {
                                        console.warn(`Geladener Spielstand: 'machines' Parameter ist ungültig oder leer. Wird mit Standard initialisiert.`);
                                        FIXED_PARAMETERS.machines = JSON.parse(JSON.stringify(defaultPreset.machines));
                                    } else {
                                        // Ensure each machine type within machines is valid
                                        for (const machineKey in defaultPreset.machines) {
                                            if (!FIXED_PARAMETERS.machines.hasOwnProperty(machineKey) || typeof FIXED_PARAMETERS.machines[machineKey] !== 'object') {
                                                FIXED_PARAMETERS.machines[machineKey] = JSON.parse(JSON.stringify(defaultPreset.machines[machineKey]));
                                                 console.warn(`Geladener Spielstand: Maschine '${machineKey}' fehlte oder war ungültig und wurde mit Standard initialisiert.`);
                                            }
                                        }
                                    }
                                } else if (!FIXED_PARAMETERS.hasOwnProperty(key)) {
                                    FIXED_PARAMETERS[key] = defaultPreset[key];
                                    console.warn(`Geladener Spielstand: Parameter '${key}' fehlte und wurde mit Standardwert initialisiert.`);
                                }
                            }
                        } else {
                            showNotification("Geladene Spielparameter sind ungültig oder unvollständig. Setze auf Standard (Einfacher Markt).", "error", 7000);
                            FIXED_PARAMETERS = JSON.parse(JSON.stringify(parameterPresets.easy));
                        }
                        DEFAULT_PARAMETERS = JSON.parse(JSON.stringify(FIXED_PARAMETERS));


                        gameState = loadedData.gameState;
                        // Wichtig: gameState.parameters muss auch die geladenen/korrigierten FIXED_PARAMETERS widerspiegeln
                        gameState.parameters = FIXED_PARAMETERS;


                        numberOfGroups = loadedData.numberOfGroups;
                        lastPeriodStateIndex = loadedData.lastPeriodStateIndex;

                        document.getElementById('initial-setup').classList.add('hidden');
                        document.getElementById('game-in-progress').classList.remove('hidden');
                        document.getElementById('game-end').classList.add('hidden');
                        document.getElementById('current-period').innerText = gameState.period;

                        updateDynamicUITexts();
                        updatePresetDropdownSelection(); // Dropdown im Einstellungsmodal aktualisieren

                        if (gameState.period === 0 && !gameState.lastPeriodMarketSummary) { // Vor Maschinenauswahl
                            setupMachineSelection();
                        } else if (gameState.lastPeriodMarketSummary) { // Nach einer abgeschlossenen Periode
                            document.getElementById('machine-selection').classList.add('hidden');
                            document.getElementById('period-decisions').classList.add('hidden');
                            document.getElementById('period-results').classList.remove('hidden');
                            document.getElementById('results-period-number').innerText = gameState.period;
                            const supportingMaterialBtnIngame = document.getElementById('supporting-material-button-ingame');
                            if (supportingMaterialBtnIngame) supportingMaterialBtnIngame.classList.remove('hidden');
                            displayPeriodResults();
                        } else { // In der Entscheidungsphase einer Periode > 0
                            document.getElementById('machine-selection').classList.add('hidden');
                            document.getElementById('period-results').classList.add('hidden');
                            document.getElementById('period-decisions').classList.remove('hidden');
                            const supportingMaterialBtnIngame = document.getElementById('supporting-material-button-ingame');
                            if (supportingMaterialBtnIngame) supportingMaterialBtnIngame.classList.remove('hidden');
                            setupPeriodInputs();
                        }
                        isGameSavedSinceLastChange = true; // Spiel wurde gerade geladen
                        showNotification("Spielstand erfolgreich geladen!", "success");
                    } else {
                        showNotification("Ungültige Speicherdatei. Fehlende Daten.");
                    }
                } catch (error) {
                    console.error("Fehler beim Laden des Spiels:", error);
                    showNotification("Fehler beim Laden des Spielstands. Datei ist möglicherweise beschädigt oder nicht im korrekten Format.");
                } finally {
                    fileInput.value = ''; // Reset file input
                }
            };
            reader.onerror = function() {
                showNotification("Fehler beim Lesen der Datei.");
                fileInput.value = ''; // Reset file input
            };
            reader.readAsText(file);
        }


        function updateDynamicUITexts() {
             ensureValidFixedParameters("updateDynamicUITexts");
            // Tooltips aktualisieren
            tooltips['market-analysis'].text = `Aktivieren Sie diese Option, um eine Marktanalyse für ${formatCurrency(FIXED_PARAMETERS.marketAnalysisCost)} zu kaufen. Die Analyse liefert Ihnen detaillierte Infos über Konkurrenz und Markt der letzten Periode.`;
            tooltips['rnd-investment'].text = `Ab Periode 3: Geben Sie einen Betrag ein, den Ihre Gruppe in F&E investieren möchte. Kumulierte Investitionen von ${formatCurrency(FIXED_PARAMETERS.rndBenefitThreshold)} führen zu einer permanenten Reduzierung der variablen Produktionskosten um ${(FIXED_PARAMETERS.rndVariableCostReduction * 100).toFixed(1)}%. ${FIXED_PARAMETERS.isRndEnabled ? '' : '(F&E ist aktuell in den Einstellungen deaktiviert.)'}`;
            tooltips['inventoryCostPerUnit'].text = `Die Kosten pro Einheit (${formatCurrency(FIXED_PARAMETERS.inventoryCostPerUnit)}), die am Ende jeder Periode für im Lager befindliche Produkte anfallen.`;
            tooltips['machineDegradationRate'].text = `Der Prozentsatz (${(FIXED_PARAMETERS.machineDegradationRate * 100).toFixed(0)}%) der anfänglichen Kapazität, den jede Maschine pro Periode verliert.`;
            tooltips['initialMarketSaturationFactor'].text = `Bestimmt, welcher Anteil der gesamten initialen Produktionskapazität aller Gruppen als anfängliche Marktnachfrage (bei Referenzpreis) dient (z.B. ${FIXED_PARAMETERS.initialMarketSaturationFactor} für ${(FIXED_PARAMETERS.initialMarketSaturationFactor * 100).toFixed(0)}%).`;
            tooltips['minPriceElasticityDemandMultiplier'].text = `Verhindert, dass die Nachfrage aufgrund hoher Durchschnittspreise unter diesen Multiplikator der Basisnachfrage fällt (z.B. ${FIXED_PARAMETERS.minPriceElasticityDemandMultiplier} für ${(FIXED_PARAMETERS.minPriceElasticityDemandMultiplier * 100).toFixed(0)}%). Beeinflusst die Nachfrage *vor* Marketing.`;
            tooltips['marketingEffectivenessFactor'].text = `Bestimmt, wie stark sich die individuelle Marketing-Bewertung (Periode 5) auf den Absatzanteil auswirkt (z.B. ${(FIXED_PARAMETERS.marketingEffectivenessFactor * 100).toFixed(0)}% Bonus pro Punkt über 5).`;


            // F&E Info-Text in Periodenansicht aktualisieren
            if (FIXED_PARAMETERS.isRndEnabled && gameState.period >= 3 && document.getElementById('rnd-machine-info') && !document.getElementById('rnd-machine-info').classList.contains('hidden')) {
                document.getElementById('info-period-number').innerText = gameState.period;
                document.getElementById('rnd-threshold-info').innerText = formatCurrency(FIXED_PARAMETERS.rndBenefitThreshold);
                document.getElementById('rnd-reduction-info').innerText = `${(FIXED_PARAMETERS.rndVariableCostReduction * 100).toFixed(1)}%`;
            }
        }

        function toggleFullscreenNextPeriodTask() {
            const modal = document.getElementById('nextPeriodTaskModal');
            const isFullscreenEnabled = document.fullscreenEnabled || document.webkitFullscreenEnabled || document.msFullscreenEnabled;

            if (!isFullscreenEnabled) {
                showNotification("Vollbildmodus wird in dieser Umgebung nicht unterstützt oder ist blockiert.", "error");
                return;
            }

            if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
                document.body.style.overflow = 'hidden'; // Haupt-Scrollbar ausblenden
                if (modal.requestFullscreen) {
                    modal.requestFullscreen().catch(err => {
                        console.error("Fullscreen request failed:", err);
                        document.body.style.overflow = ''; // Scrollbar wiederherstellen bei Fehler
                        showNotification("Vollbild konnte nicht aktiviert werden.", "error");
                    });
                } else if (modal.webkitRequestFullscreen) { /* Safari */
                    modal.webkitRequestFullscreen().catch(err => {
                        console.error("Fullscreen request failed (webkit):", err);
                        document.body.style.overflow = '';
                        showNotification("Vollbild konnte nicht aktiviert werden.", "error");
                    });
                } else if (modal.msRequestFullscreen) { /* IE11 */
                    modal.msRequestFullscreen().catch(err => {
                        console.error("Fullscreen request failed (ms):", err);
                        document.body.style.overflow = '';
                        showNotification("Vollbild konnte nicht aktiviert werden.", "error");
                    });
                }
                modal.classList.add('fullscreen-modal');
            } else {
                document.body.style.overflow = ''; // Scrollbar wiederherstellen
                if (document.exitFullscreen) {
                    document.exitFullscreen().catch(err => console.error("Exit fullscreen failed:", err));
                } else if (document.webkitExitFullscreen) { /* Safari */
                    document.webkitExitFullscreen().catch(err => console.error("Exit fullscreen failed (webkit):", err));
                } else if (document.msExitFullscreen) { /* IE11 */
                    document.msExitFullscreen().catch(err => console.error("Exit fullscreen failed (ms):", err));
                }
                modal.classList.remove('fullscreen-modal');
            }
        }

        // Event listener for fullscreen change (to remove class if exited via ESC)
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) {
                const modalContent = document.getElementById('nextPeriodTaskModal');
                if (modalContent) modalContent.classList.remove('fullscreen-modal');
                document.body.style.overflow = ''; // Scrollbar wiederherstellen
            }
        });
        document.addEventListener('webkitfullscreenchange', () => { // Safari
            if (!document.webkitFullscreenElement) {
                const modalContent = document.getElementById('nextPeriodTaskModal');
                if (modalContent) modalContent.classList.remove('fullscreen-modal');
                document.body.style.overflow = '';
            }
        });
         document.addEventListener('msfullscreenchange', () => { // IE11
            if (!document.msFullscreenElement) {
                const modalContent = document.getElementById('nextPeriodTaskModal');
                if (modalContent) modalContent.classList.remove('fullscreen-modal');
                document.body.style.overflow = '';
            }
        });

        // Warnung vor dem Verlassen der Seite, wenn ungespeicherte Änderungen vorhanden sind
        window.addEventListener('beforeunload', function (e) {
            if (gameState && gameState.period >= 0 && !isGameSavedSinceLastChange) {
                e.preventDefault(); // Gemäß Spezifikation erforderlich
                e.returnValue = ''; // Für manche ältere Browser erforderlich
            }
            // Electron-spezifische Abfrage (konzeptionell, muss in main.js implementiert werden):
            // Wenn dies eine Electron-App ist, könnte hier eine IPC-Nachricht an den Hauptprozess gesendet werden,
            // um einen nativen Dialog anzuzeigen.
            // Beispiel:
            // if (typeof window.electron !== 'undefined' && typeof window.electron.ipcRenderer !== 'undefined') {
            //   const hasUnsavedChanges = gameState && gameState.period >= 0 && !isGameSavedSinceLastChange;
            //   const confirmation = window.electron.ipcRenderer.sendSync('confirm-close-app', hasUnsavedChanges);
            //   if (!confirmation) {
            //     e.preventDefault();
            //     e.returnValue = '';
            //   }
            // }
        });


        document.addEventListener('DOMContentLoaded', (event) => {
            // Initialisiere FIXED_PARAMETERS mit dem "easy" Preset, falls keine gespeicherten Einstellungen vorhanden sind
            loadPreferences(); // Lädt Einstellungen aus localStorage, falls vorhanden
                               // Wenn keine Einstellungen geladen wurden, bleibt FIXED_PARAMETERS auf dem global definierten "easy" Preset.
            ensureValidFixedParameters("DOMContentLoaded");


            updateDynamicUITexts();
            // updateVersionAndTime(); // Entfernt, da der Zeitstempel statisch sein soll
            document.getElementById('initial-setup').classList.remove('hidden');
            setupGroupSelectionDropdown();
            setupGroupNameInputs();
            document.getElementById('notification-close-button').addEventListener('click', hideNotification);

            const loadGameInput = document.getElementById('load-game-input');
            if (loadGameInput) {
                loadGameInput.addEventListener('change', loadGameFromFile);
            }

            const autoSavedDataString = localStorage.getItem(AUTOSAVE_KEY);
            if (autoSavedDataString) {
                try {
                    const autoSavedData = JSON.parse(autoSavedDataString);
                    if (autoSavedData.timestamp) {
                        showAutoSaveModal(autoSavedData.timestamp);
                    } else { // Alte Autosaves ohne Zeitstempel direkt verwerfen
                        localStorage.removeItem(AUTOSAVE_KEY);
                    }
                } catch (e) {
                    console.error("Fehler beim Parsen des Autosave-Zeitstempels:", e);
                    localStorage.removeItem(AUTOSAVE_KEY);
                }
            }
        });
