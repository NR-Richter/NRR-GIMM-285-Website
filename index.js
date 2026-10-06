//Libraries
import express from 'express';
import multer from 'multer';
import mysql from 'mysql2/promise';
// const express = require('express');
// const multer = require('multer');
// const mysql = require('mysql2');
// const course = require('./Model/course');

// import express from 'express';
// import multer from 'multer';
// import mysql = require('mysql2');
// import course from './Model/course';

//Setup defaults for script
const app = express();
app.use(express.static('public'))

const upload = multer()
const port = 3000 //Default port to http server

let connection = null;

async function getConnection() {
    //Singleton DB connection
    if (null === connection) {
        console.log('Here');
        connection = await mysql.createConnection({
            host: "student-databases.cvode4s4cwrc.us-west-2.rds.amazonaws.com",
            user: "NICHOLASRICHTER",
            password: "oOYELgwcZ2Rl5OzK9k6zQbQQYXEbLOBiOUL",
            database: 'NICHOLASRICHTER'
        });
    }

    return connection;
}

async function query(sql, params) {
    const dbConnection = await getConnection();
    const [results,] = await dbConnection.execute(sql, params);
    return results;
}

const VALID_TYPES = [
    'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison',
    'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
];

function parseTrimmedString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function parseFormValue(value) {
    return parseTrimmedString(value) || 'Base';
}

function validateStat(rawValue, key, displayName, errors) {
    const parsedValue = parseInt(rawValue, 10);
    if (!Number.isInteger(parsedValue) || parsedValue < 1 || parsedValue > 255) {
        errors[key] = `${displayName} must be a whole number between 1 and 255.`;
    }
    return parsedValue;
}

function validatePokemonId(rawValue, errors) {
    const normalizedValue = typeof rawValue === 'string' ? rawValue.trim() : `${rawValue ?? ''}`.trim();

    if (!/^\d+$/.test(normalizedValue)) {
        errors.id = 'National Pokedex Number must be a whole number greater than 0.';
        return null;
    }

    const parsedValue = parseInt(normalizedValue, 10);
    if (!Number.isInteger(parsedValue) || parsedValue < 1) {
        errors.id = 'National Pokedex Number must be a whole number greater than 0.';
        return null;
    }

    return parsedValue;
}

function validatePokemonFormData(body, errors) {
    const speciesId = validatePokemonId(body.id, errors);
    const speciesName = parseTrimmedString(body.name);
    const formValue = parseFormValue(body.form);
    const primaryType = parseTrimmedString(body.primaryType);
    const secondaryTypeRaw = parseTrimmedString(body.secondaryType);
    const abilityOne = parseTrimmedString(body.ability1);
    const abilityTwoRaw = parseTrimmedString(body.ability2);
    const abilityHiddenRaw = parseTrimmedString(body.ability3);
    const hp = validateStat(body.hp, 'hp', 'HP', errors);
    const attack = validateStat(body.attack, 'attack', 'Attack', errors);
    const defense = validateStat(body.defense, 'defense', 'Defense', errors);
    const spAtk = validateStat(body.spatk, 'spatk', 'Special Attack', errors);
    const spDef = validateStat(body.spdef, 'spdef', 'Special Defense', errors);
    const speed = validateStat(body.speed, 'speed', 'Speed', errors);
    const fullyEvolvedRaw = body.fully_evolved;

    if (speciesName.length === 0) {
        errors.name = 'Pokemon name is required.';
    } else if (speciesName.length > 20) {
        errors.name = 'Pokemon name must be 20 characters or fewer.';
    }

    if (formValue.length > 20) {
        errors.form = 'Form must be 20 characters or fewer.';
    }

    if (primaryType.length === 0) {
        errors.primaryType = 'Primary type is required.';
    } else if (!VALID_TYPES.includes(primaryType)) {
        errors.primaryType = 'Primary type is invalid.';
    }

    const secondaryType = secondaryTypeRaw.length > 0 ? secondaryTypeRaw : null;
    if (secondaryType !== null && !VALID_TYPES.includes(secondaryType)) {
        errors.secondaryType = 'Secondary type is invalid.';
    }
    if (secondaryType !== null && secondaryType === primaryType) {
        errors.secondaryType = 'Secondary type must be different from primary type.';
    }

    if (abilityOne.length === 0) {
        errors.ability1 = 'Ability one is required.';
    } else if (abilityOne.length > 20) {
        errors.ability1 = 'Ability one must be 20 characters or fewer.';
    }

    const abilityTwo = abilityTwoRaw.length > 0 ? abilityTwoRaw : null;
    if (abilityTwo !== null && abilityTwo.length > 20) {
        errors.ability2 = 'Ability two must be 20 characters or fewer.';
    }

    const abilityHidden = abilityHiddenRaw.length > 0 ? abilityHiddenRaw : null;
    if (abilityHidden !== null && abilityHidden.length > 20) {
        errors.ability3 = 'Hidden ability must be 20 characters or fewer.';
    }

    let fullyEvolved = 0;
    if (
        fullyEvolvedRaw === true ||
        fullyEvolvedRaw === 'true' ||
        fullyEvolvedRaw === 1 ||
        fullyEvolvedRaw === '1'
    ) {
        fullyEvolved = 1;
    } else if (
        fullyEvolvedRaw === false ||
        fullyEvolvedRaw === 'false' ||
        fullyEvolvedRaw === 0 ||
        fullyEvolvedRaw === '0'
    ) {
        fullyEvolved = 0;
    } else {
        errors.fully_evolved = 'Fully evolved must be true or false.';
    }

    return {
        speciesId,
        speciesName,
        formValue,
        primaryType,
        secondaryType,
        abilityOne,
        abilityTwo,
        abilityHidden,
        hp,
        attack,
        defense,
        spAtk,
        spDef,
        speed,
        fullyEvolved
    };
}

//The * in app.* needs to match the method type of the request
app.get(
    '/pokemon/',
    upload.none(),
    async (request, response) => {
        let result = {};
        try {
            let selectSql = `SELECT
                        s.id,
                        s.species_name,
                        CASE WHEN f.form <> 'Base' THEN f.form ELSE NULL END AS form,
                        f.type_one AS primary_type,
                        f.type_two AS secondary_type,
                        f.ability_one,
                        f.ability_two,
                        f.ability_hidden,
                        f.hp AS health,
                        f.attack,
                        f.defense,
                        f.sp_atk,
                        f.sp_def,
                        f.speed,
                        f.bst AS base_stat_total
                    FROM pokemon_species s
                    INNER JOIN pokemon_forms f ON s.id = f.id`,
                whereStatements = [],
                orderByStatements = [],
                queryParameters = [];

            if (typeof request.query.name !== 'undefined' && request.query.name.length > 0) {
                whereStatements.push(`s.species_name = ?`);
                queryParameters.push(request.query.name);
            }

            if (typeof request.query.type !== 'undefined' && request.query.type.length > 0) {
                whereStatements.push(`(f.type_one = ? OR f.type_two = ?)`);
                queryParameters.push(request.query.type);
                queryParameters.push(request.query.type);
            }

            if (typeof request.query.ability !== 'undefined' && request.query.ability.length > 0) {
                whereStatements.push(`(f.ability_one = ? OR f.ability_two = ? OR f.ability_hidden = ?)`);
                queryParameters.push(request.query.ability);
                queryParameters.push(request.query.ability);
                queryParameters.push(request.query.ability);
            }

            if (typeof request.query.highestStat !== 'undefined' && request.query.highestStat.length > 0) {
                whereStatements.push(`CASE 
        WHEN f.hp = GREATEST(f.hp, f.attack, f.defense, f.sp_atk, f.sp_def, f.speed) THEN 'HP'
        WHEN f.attack = GREATEST(f.hp, f.attack, f.defense, f.sp_atk, f.sp_def, f.speed) THEN 'Attack'
        WHEN f.defense = GREATEST(f.hp, f.attack, f.defense, f.sp_atk, f.sp_def, f.speed) THEN 'Defense'
        WHEN f.sp_atk = GREATEST(f.hp, f.attack, f.defense, f.sp_atk, f.sp_def, f.speed) THEN 'Sp. Atk'
        WHEN f.sp_def = GREATEST(f.hp, f.attack, f.defense, f.sp_atk, f.sp_def, f.speed) THEN 'Sp. Def'
        WHEN f.speed = GREATEST(f.hp, f.attack, f.defense, f.sp_atk, f.sp_def, f.speed) THEN 'Speed'
    END = ?`);
                queryParameters.push(request.query.highestStat);
            }

            if (typeof request.query.fully_evolved !== 'undefined' && request.query.fully_evolved.length > 0) {
                if (request.query.fully_evolved === 'true') {
                    whereStatements.push(`(f.fully_evolved = 1 OR f.fully_evolved IS NULL)`);
                }
            }


            if (typeof request.query.sort !== 'undefined' && request.query.sort.length > 0) {
                const sortMap = {
                    'DEXASC': 's.id ASC',
                    'DEXDESC': 's.id DESC',
                    'NAMEASC': 's.species_name ASC',
                    'NAMEDESC': 's.species_name DESC',
                    'BSTASC': 'f.bst ASC',
                    'BSTDESC': 'f.bst DESC'
                };
                if (sortMap[request.query.sort]) {
                    orderByStatements.push(sortMap[request.query.sort]);
                }
            }

            //Dynamically add WHERE expressions to SELECT statements if needed
            if (whereStatements.length > 0) {
                selectSql = selectSql + ' WHERE ' + whereStatements.join(' AND ');
            }

            //Dynamically add ORDER BY expressions to SELECT statements if needed
            if (orderByStatements.length > 0) {
                selectSql = selectSql + ' ORDER BY ' + orderByStatements.join(', ');
            } else {
                selectSql = selectSql + ' ORDER BY s.id ASC';
            }

            //Dynamically add LIMIT expressions to SELECT statements if needed
            if (typeof request.query.limit !== 'undefined' && request.query.limit.length > 0) {
                const limitValue = parseInt(request.query.limit, 10);

                if (Number.isInteger(limitValue) && limitValue > 0) {
                    selectSql = selectSql + ` LIMIT ${limitValue}`;
                }
            }

            result = await query(selectSql, queryParameters);
        } catch (error) {
            console.log(error);
            return response.status(500) //Error code 
                .json({ message: 'Something went wrong with the server.' });
        }
        //Default response object
        response.json({ 'data': result });
    });

app.get(
    '/pokemon/:id',
    upload.none(),
    async (request, response) => {
        const errors = {};
        const speciesId = validatePokemonId(request.params.id, errors);
        const requestedForm = parseTrimmedString(request.query.form);

        if (Object.keys(errors).length > 0) {
            return response.status(400).json({
                message: 'Validation failed.',
                errors
            });
        }

        try {
            let selectSql = `SELECT
                        s.id,
                        s.species_name,
                        CASE WHEN f.form <> 'Base' THEN f.form ELSE NULL END AS form,
                        f.type_one AS primary_type,
                        f.type_two AS secondary_type,
                        f.ability_one,
                        f.ability_two,
                        f.ability_hidden,
                        f.hp AS health,
                        f.attack,
                        f.defense,
                        f.sp_atk,
                        f.sp_def,
                        f.speed,
                        f.fully_evolved,
                        f.bst AS base_stat_total
                    FROM pokemon_species s
                    INNER JOIN pokemon_forms f ON s.id = f.id
                    WHERE s.id = ?`;

            const queryParameters = [speciesId];

            if (requestedForm.length > 0) {
                selectSql = selectSql + ' AND f.form = ?';
                queryParameters.push(requestedForm);
            } else {
                selectSql = selectSql + " ORDER BY CASE WHEN f.form = 'Base' THEN 0 ELSE 1 END, f.form ASC LIMIT 1";
            }

            const result = await query(selectSql, queryParameters);

            if (result.length === 0) {
                return response.status(404).json({ message: 'Pokemon record not found.' });
            }

            response.json({ data: result[0] });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Something went wrong with the server.' });
        }
    }
);

app.post(
    '/pokemon',
    upload.none(),
    async (request, response) => {
        const errors = {};
        const {
            speciesId,
            speciesName,
            formValue,
            primaryType,
            secondaryType,
            abilityOne,
            abilityTwo,
            abilityHidden,
            hp,
            attack,
            defense,
            spAtk,
            spDef,
            speed,
            fullyEvolved
        } = validatePokemonFormData(request.body, errors);

        if (Object.keys(errors).length > 0) {
            return response.status(400).json({
                message: 'Validation failed.',
                errors
            });
        }

        const baseStatTotal = hp + attack + defense + spAtk + spDef + speed;
        const dbConnection = await getConnection();

        try {
            await dbConnection.beginTransaction();

            const [matchingSpeciesRows] = await dbConnection.execute(
                `SELECT id, species_name
                 FROM pokemon_species
                 WHERE id = ? OR species_name = ?`,
                [speciesId, speciesName]
            );

            const speciesById = matchingSpeciesRows.find((row) => row.id === speciesId) || null;
            const speciesByNameMatches = matchingSpeciesRows.filter((row) => row.species_name === speciesName);

            if (speciesByNameMatches.length > 1) {
                await dbConnection.rollback();
                return response.status(409).json({
                    message: 'Multiple species rows already use that Pokemon name.',
                    errors: {
                        name: 'Pokemon name is not unique in the database. Use a unique name or get fucked.'
                    }
                });
            }

            const speciesByName = speciesByNameMatches[0] || null;
            let resolvedSpeciesId = speciesId;
            let createdNewSpecies = false;

            // If one identifier exists, both must point at the same species to avoid attaching a form to the wrong Pokemon.
            if (speciesById !== null || speciesByName !== null) {
                if (speciesById === null || speciesByName === null || speciesById.id !== speciesByName.id) {
                    await dbConnection.rollback();
                    return response.status(409).json({
                        message: 'National Pokedex Number and Pokemon name must match the same existing Pokemon.',
                        errors: {
                            id: 'Use the National Pokedex Number that matches the Pokemon name.',
                            name: 'Use the Pokemon name that matches the National Pokedex Number.'
                        }
                    });
                }

                resolvedSpeciesId = speciesById.id;
            } else {
                await dbConnection.execute(
                    `INSERT INTO pokemon_species (id, species_name)
                     VALUES (?, ?)`,
                    [speciesId, speciesName]
                );
                createdNewSpecies = true;
            }

            const [existingForms] = await dbConnection.execute(
                `SELECT 1
                 FROM pokemon_forms
                 WHERE id = ? AND form = ?
                 LIMIT 1`,
                [resolvedSpeciesId, formValue]
            );

            if (existingForms.length > 0) {
                await dbConnection.rollback();
                return response.status(409).json({
                    message: 'That form already exists for this Pokemon.',
                    errors: {
                        form: 'Use a different form name for this Pokemon.'
                    }
                });
            }

            await dbConnection.execute(
                `INSERT INTO pokemon_forms
                 (id, form, type_one, type_two, ability_one, ability_two, ability_hidden, fully_evolved, hp, attack, defense, sp_atk, sp_def, speed, bst)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [resolvedSpeciesId, formValue, primaryType, secondaryType, abilityOne, abilityTwo, abilityHidden, fullyEvolved, hp, attack, defense, spAtk, spDef, speed, baseStatTotal]
            );

            await dbConnection.commit();
            return response.status(201).json({
                message: createdNewSpecies
                    ? 'Pokemon inserted successfully.'
                    : 'Pokemon form inserted successfully for existing Pokemon.',
                data: {
                    id: resolvedSpeciesId,
                    form: formValue,
                    createdNewSpecies
                }
            });
        } catch (error) {
            await dbConnection.rollback();

            if (error && error.code === 'ER_DUP_ENTRY') {
                return response.status(409).json({
                    message: 'That value is already in use.',
                    errors: {
                        id: 'Choose a National Pokedex Number that matches this Pokemon or use a new one.',
                        form: 'If adding a form to an existing Pokemon, use a new form name.'
                    }
                });
            }

            console.log(error);
            return response.status(500).json({ message: 'Something went wrong with the server.' });
        }
    }
);

app.put(
    '/pokemon/:id',
    upload.none(),
    async (request, response) => {
        const errors = {};
        const originalId = validatePokemonId(request.params.id, errors);
        const requestedOriginalForm = parseTrimmedString(request.query.form);
        const originalForm = requestedOriginalForm.length > 0 ? requestedOriginalForm : 'Base';

        const {
            speciesId,
            speciesName,
            formValue,
            primaryType,
            secondaryType,
            abilityOne,
            abilityTwo,
            abilityHidden,
            hp,
            attack,
            defense,
            spAtk,
            spDef,
            speed,
            fullyEvolved
        } = validatePokemonFormData(request.body, errors);

        if (speciesId !== null && originalId !== null && speciesId !== originalId) {
            errors.id = 'National Pokedex Number cannot be changed during edit.';
        }

        if (Object.keys(errors).length > 0) {
            return response.status(400).json({
                message: 'Validation failed.',
                errors
            });
        }

        const baseStatTotal = hp + attack + defense + spAtk + spDef + speed;
        const dbConnection = await getConnection();

        try {
            await dbConnection.beginTransaction();

            const [duplicateSpeciesRows] = await dbConnection.execute(
                `SELECT id
                 FROM pokemon_species
                 WHERE species_name = ? AND id <> ?
                 LIMIT 1`,
                [speciesName, originalId]
            );

            if (duplicateSpeciesRows.length > 0) {
                await dbConnection.rollback();
                return response.status(409).json({
                    message: 'Pokemon name is already in use.',
                    errors: {
                        name: 'Pokemon name must be unique in the database.'
                    }
                });
            }

            const [duplicateFormRows] = await dbConnection.execute(
                `SELECT 1
                 FROM pokemon_forms
                 WHERE id = ? AND form = ?
                 LIMIT 1`,
                [originalId, formValue]
            );

            if (duplicateFormRows.length > 0 && formValue !== originalForm) {
                await dbConnection.rollback();
                return response.status(409).json({
                    message: 'That form already exists for this Pokemon.',
                    errors: {
                        form: 'Use a different form name for this Pokemon.'
                    }
                });
            }

            const speciesResult = await dbConnection.execute(
                `UPDATE pokemon_species
                 SET species_name = ?
                 WHERE id = ?`,
                [speciesName, originalId]
            );

            const formResult = await dbConnection.execute(
                `UPDATE pokemon_forms
                 SET form = ?, type_one = ?, type_two = ?, ability_one = ?, ability_two = ?, ability_hidden = ?, fully_evolved = ?, hp = ?, attack = ?, defense = ?, sp_atk = ?, sp_def = ?, speed = ?, bst = ?
                 WHERE id = ? AND form = ?`,
                [formValue, primaryType, secondaryType, abilityOne, abilityTwo, abilityHidden, fullyEvolved, hp, attack, defense, spAtk, spDef, speed, baseStatTotal, originalId, originalForm]
            );

            if (speciesResult[0].affectedRows === 0 || formResult[0].affectedRows === 0) {
                await dbConnection.rollback();
                return response.status(404).json({ message: 'Pokemon record not found.' });
            }

            await dbConnection.commit();
            return response.json({
                message: 'Pokemon updated successfully.',
                data: {
                    id: originalId,
                    form: formValue
                }
            });
        } catch (error) {
            await dbConnection.rollback();
            console.log(error);
            return response.status(500).json({ message: 'Something went wrong with the server.' });
        }
    }
);

app.listen(port, () => {
    console.log(`Application listening at http://localhost:${port}`);
})
