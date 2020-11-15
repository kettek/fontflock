/**
 * averageHP returns the average HP value for the given HD and dice.
 * @param {Number} hd 
 * @param {Number} d 
 * @returns {Number}
 */
function averageHP(hd=1, d=8) {
  let error
  if (isNaN(hd)) {
    hd = 1
    error = 'bad hd'
  }
  if (isNaN(d)) {
    d = 8
    error = 'bad die'
  }
  return [Math.floor((d+1)/2 * hd), error]
}

function conHP(hd=1, con=10) {
  let error
  if (isNaN(hd)) {
    hd = 1
    error = 'bad hd'
  }
  if (isNaN(con)) {
    con = 10
    error = 'bad con'
  }
  return [Math.floor((con-10)/2) * hd, error]
}

/**
 * getBonusHP gets the total bonus hit points. This includes con mod, items, feats, and favored levels.
 * @param {BestiaryEntrySchema} entry The entry to target
 * @returns {Number} Total bonus hit points.
 */
function getBonusHP(entry) {
  let hp = 0
  let totalLevel = entry.hitdice
  // Collect total level and also add favored class HP
  for (let level of entry.levels) {
    totalLevel += level.level
    if (level.favored) {
      hp += level.level
    }
  }
  // Add con mod
  hp += getAbilityScoreMod(entry, 'con') * totalLevel // TODO: Undead check to use cha
  // Feat modifiers.
  for (const feat of entry.feats) {
    for (const modifier of feat.modifies) {
      if (modifier.dot === 'hp') {
        hp += Number(modifier.value)
      }
    }
  }
  // Items modifiers.
  for (let itemIndex = 0; itemIndex < entry.items.length; itemIndex++) {
    if (!entry.items[itemIndex].properties.equipped) continue
    hp += getItemModifierField(entry, itemIndex, 'hp')
  }
  return hp
}

/**
 * collectHD returns a sorted map of hitpips to hitdice collected from the entry's hitdice and hitpips as well as the entry's levels.
 * @param {BestiaryEntrySchema} entry The entry to target
 * @returns {Map} Map of hitpips to hitdice count, sorted from highest to lowest.
 */
function collectHD(entry) {
  let results = new Map()
  if (entry.hitdice && entry.hitpips) {
    results.set(entry.hitpips, entry.hitdice + (results.get(entry.hitpips)||0))
  }
  if (entry.levels) {
    for (let level of entry.levels) {
      results.set(level.hitpips, level.level + (results.get(level.hitpips)||0))
    }
  }
  results = new Map([...results.entries()].sort((a,b)=>b[0]-a[0]))
  return [results, undefined]
}

/**
 * getBaseAttack returns the highest base attack from the base HD*BAB or each level's BAB * level. This presumes non-fractional BAB calculation.
 * @param {BestiaryEntrySchema} entry The entry to target
 * @returns {Number} Calculated highest base attack.
 */
function getBaseAttack(entry) {
  let bestattack = Math.floor(entry.hitdice * entry.bab)
  if (entry.levels) {
    for (let i = 0; i < entry.levels.length; i++) {
      let level = entry.levels[i]
      let baseattack = Math.floor(level.bab * level.level)
      if (baseattack > bestattack) {
        bestattack = baseattack
      }
    }
  }
  return bestattack
}

/**
 * sizeModifiers is a mapping of string->number values of sizes to their respective bonuses/penalties.
 */
const sizeModifiers = {
  'fine': -8,
  'diminutive': -4,
  'tiny': -2,
  'small': -1,
  'medium': 0,
  'large': 1,
  'huge': 2,
  'gargantuan': 4,
  'colossal': 8,
}

/**
 * getCMB returns the combat maneuver bonus.
 * @param {BestiaryEntrySchema} entry The entry to target.
 * @returns {Number} Calculated CMB.
 */
function getCMB(entry) {
  let baseattack = getBaseAttack(entry)
  let strmod = getAbilityScoreMod(entry, 'str')
  let sizemod = sizeModifiers[entry.size]
  let other = 0 // TODO
  // Feat modifiers.
  for (const feat of entry.feats) {
    for (const modifier of feat.modifies) {
      if (modifier.dot === 'cmb') {
        other += Number(modifier.value)
      }
    }
  }
  // Items modifiers.
  for (let itemIndex = 0; itemIndex < entry.items.length; itemIndex++) {
    if (!entry.items[itemIndex].properties.equipped) continue
    other += getItemModifierField(entry, itemIndex, 'cmb')
  }

  return baseattack + strmod + sizemod + other
}

/**
 * getCMD returns the combat maneuver defense.
 * @param {BestiaryEntrySchema} entry The entry to target.
 * @returns {Number} Calculated CMD.
 */
function getCMD(entry) {
  let base = 10
  let baseattack = getBaseAttack(entry)
  let strmod = getAbilityScoreMod(entry, 'str')
  let dexmod = getAbilityScoreMod(entry, 'dex')
  let sizemod = sizeModifiers[entry.size]
  let other = 0 // TODO: This could be deflection, dodge, insight, morale, profale, sacred, as well as penalties (to Touch AC)
  return base + baseattack + strmod + dexmod + sizemod + other
}

/**
 * shortAlignments is a string->string mapping of full alignment names to their single-character counterparts.
 */
const shortAlignments = {
  'neutral': 'N',
  'good': 'G',
  'evil': 'E',
  'lawful': 'L',
  'chaotic': 'C',
}

/**
 * getShortAlignment returns the single-letter alignment from an AlignmentSchema-valid object.
 * @param {Object} alignment The alignment object.
 * @param {String} alignment.law The law alignment, may be "lawful", "neutral", or "chaotic".
 * @param {String} alignment.moral The moral alignment, may be "good", "neutral", or "evil".
 * @returns {String} The 1 or 2 letter version of the alignment.
 */
function getShortAlignment(alignment) {
  let a = '-'
  if (alignment.law === 'neutral' && alignment.moral === 'neutral') {
    a = 'N'
  } else {
    a = shortAlignments[alignment.law]+shortAlignments[alignment.moral]
  }
  return a
}

/**
 * getItemModifierField gets the calculated field for a given entry. This parses feats for item modifiers.
 * @param {BestiaryEntrySchema} entry The entry to target.
 * @param {Number} itemIndex The item index to target.
 * @param {String} which The field to target.
 */
function getItemModifierField(entry, itemIndex, which) {
  let item = entry.items[itemIndex]
  let value = 0
  for (let itemModifierIndex = 0; itemModifierIndex < item.modifies.length; itemModifierIndex++) {
    let itemModifier = item.modifies[itemModifierIndex]
    if (itemModifier.dot !== which) continue
    value += Number(itemModifier.value)
    // Check for feat modifications.
    for (const feat of entry.feats) {
      for (const featModifier of feat.modifies) {
        if (featModifier.dot === `items.${itemIndex}.modifies.${itemModifierIndex}`) {
          value += Number(featModifier.value)
        }
      }
    }
  }
  return value
}

/**
 * getAbilityScore gets the calculated ability score for a given entry.
 * @param {BestiaryEntrySchema} entry The entry to target.
 * @param {String} which The ability score, may be "str", "con", "dex", "wis", "int", or "cha".
 * @returns {Number} The calculated ability score.
 */
function getAbilityScore(entry, which) {
  let base = entry["ability scores"][which]
  let mod = 0
  // Feats *rarely* give ability scores -- some deep eldritch bloodline does, I think.
  for (const feat of entry.feats) {
    for (const modifier of feat.modifies) {
      if (modifier.dot === `ability scores.${which}`) {
        mod += Number(modifier.value)
      }
    }
  }
  // Items modifiers.
  for (let itemIndex = 0; itemIndex < entry.items.length; itemIndex++) {
    if (!entry.items[itemIndex].properties.equipped) continue
    mod += getItemModifierField(entry, itemIndex, `ability scores.${which}`)
  }
  return base + mod
}

/**
 * getAbilityScoreMod gets the ability score modifier for a given entry and ability score.
 * @param {BestiaryEntrySchema} entry The entry to target.
 * @param {String} which The ability score, may be "str", "con", "dex", "wis", "int", or "cha".
 * @returns {Number} The calculated ability score modifier.
 */
function getAbilityScoreMod(entry, which) {
  return Math.floor((getAbilityScore(entry, which) - 10) / 2)
}

/**
 * getSave gets the save score for a given entry and save. It will use the highest save possible calculated from the creature's base save and HD or the creature's best level's save.
 * @param {BestiaryEntrySchema} entry The entry to target.
 * @param {String} which The save, may be "fortitude", "reflex", or "will".
 * @returns {Number} The calculated save.
 */
function getSave(entry, which) {
  // Base save.
  let basesave = entry.saves[which]==='good'?2:0
  basesave += (entry.saves[which]==='good'?0.5:0.34) * entry.hitdice // NOTE: I don't know if 0.34 is correct, but it works up to lvl 20.
  if (entry.levels) {
    for (let i = 0; i < entry.levels.length; i++) {
      let level = entry.levels[i]
      let save = level.saves[which]==='good'?2:0
      save += (level.saves[which]==='good'?0.5:0.34) * level.level
      if (save > basesave) {
        basesave = save
      }
    }
  }
  // Ability score mods.
  if (which === 'fortitude') {
    basesave += getAbilityScoreMod(entry, 'con')
  } else if (which === 'reflex') {
    basesave += getAbilityScoreMod(entry, 'dex')
  } else if (which === 'will') {
    basesave += getAbilityScoreMod(entry, 'wis')
  }
  // Feat modifiers.
  for (const feat of entry.feats) {
    for (const modifier of feat.modifies) {
      if (modifier.dot === `saves.${which}`) {
        basesave += Number(modifier.value)
      }
    }
  }
  // Items modifiers.
  for (let itemIndex = 0; itemIndex < entry.items.length; itemIndex++) {
    if (!entry.items[itemIndex].properties.equipped) continue
    basesave += getItemModifierField(entry, itemIndex, `saves.${which}`)
  }
  return Math.floor(basesave)
}

/**
 * getInitiative returns the calculated initiative of the entry.
 * @param {BestiaryEntrySchema} entry The entry to target.
 * @returns {Number} The calculated initiative.
 */
function getInitiative(entry) {
  let dexmod = getAbilityScoreMod(entry, 'dex')
  return dexmod
}


function getACMap(entry) {
  let ac = {
    'armor': 0,
    'deflection': 0,
    'Dex': 0,
    'dodge': 0,
    'enhancement': 0,
    'insight': 0,
    'luck': 0,
    'natural': 0,
    'profane': 0,
    'sacred': 0,
    'shield': 0,
    'size': sizeModifiers[entry.size] !== undefined ? -sizeModifiers[entry.size] : 0,
  }
  // Feat modifiers.
  for (const feat of entry.feats) {
    for (const modifier of feat.modifies) {
      if (modifier.dot.startsWith('ac.')) {
        let t = modifier.dot.slice(3)
        let v = Number(modifier.value)
        if (ac[t] !== undefined && v > ac[t]) {
          ac[t] = v
        }
      }
    }
  }
  // Items modifiers.
  for (let itemIndex = 0; itemIndex < entry.items.length; itemIndex++) {
    let item = entry.items[itemIndex]
    if (!item.properties.equipped) continue
    for (const modifier of item.modifies) {
      if (modifier.dot.startsWith('ac.')) {
        // TODO: Merge item's enhancement AC with its armor AC
        let t = modifier.dot.slice(3)
        let v = Number(modifier.value)
        if (ac[t] !== undefined && v > ac[t]) {
          ac[t] = v
        }
      }
    }
  }
  // Get our dex mod.
  ac['Dex'] = getAbilityScoreMod(entry, 'dex')
  // Return our total.
  return ac
}

function getAC(entry) {
  let total = 10
  for(let v of Object.values(getACMap(entry))) {
    total += v
  }
  return total
}

function getTouchAC(entry) {
  let dexmod = getAbilityScoreMod(entry, 'dex')
  let sizemod = sizeModifiers[entry.size] !== undefined ? -sizeModifiers[entry.size] : 0
  let deflection = 0
  // Feat modifiers.
  for (const feat of entry.feats) {
    for (const modifier of feat.modifies) {
      if (modifier.dot === 'ac.deflection') {
        if (modifier.value > deflection) {
          deflection = modifier.value
        }
      }
    }
  }
  // Items modifiers.
  for (let itemIndex = 0; itemIndex < entry.items.length; itemIndex++) {
    let item = entry.items[itemIndex]
    if (!item.properties.equipped) continue
    for (const modifier of item.modifies) {
      if (modifier.dot === 'ac.deflection') {
        if (modifier.value > deflection) {
          deflection = modifier.value
        }
      }
    }
  }
  return 10 + dexmod + sizemod + deflection
}

function getFlatFootedAC(entry) {
  // Let's be lazy.
  let ac = getAC(entry)
  let shouldRemoveDex = true
  // TODO: Check for Uncanny Dodge feature
  if (shouldRemoveDex) {
    ac -= getAbilityScoreMod(entry, 'dex')
  }
  return ac
}

module.exports = {
  averageHP: averageHP,
  conHP: conHP,
  getBonusHP: getBonusHP,
  collectHD: collectHD,
  getAC: getAC,
  getACMap: getACMap,
  getTouchAC: getTouchAC,
  getFlatFootedAC: getFlatFootedAC,
  getBaseAttack: getBaseAttack,
  getCMB: getCMB,
  getCMD: getCMD,
  getShortAlignment: getShortAlignment,
  getSave: getSave,
  getAbilityScore, getAbilityScore,
  getAbilityScoreMod: getAbilityScoreMod,
  getInitiative: getInitiative,
}