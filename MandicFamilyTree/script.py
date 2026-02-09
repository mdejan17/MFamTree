import random
from datetime import datetime, timedelta

# -------------------------------------------------------
#  Configuration
# -------------------------------------------------------

FAMILY_NAME = "Sinclair"
START_YEAR = 1925
CURRENT_YEAR = 2026

# Probability distribution for number of children
CHILDREN_DISTRIBUTION = [1, 2, 2, 2, 3]  # mostly 2, some 1, some 3

MALE_FIRST_NAMES = [
    "Alistair", "Euan", "Finlay", "Hamish", "Lachlan", "Callum", "Rory",
    "Duncan", "Gregor", "Niall", "Theo", "Declan", "Rowan", "Fergus",
    "Magnus", "Struan", "Cameron", "Harris", "Lewis", "Arran"
]

FEMALE_FIRST_NAMES = [
    "Morven", "Isla", "Catriona", "Ailsa", "Sorcha", "Eilidh", "Fiona",
    "Mairi", "Niamh", "Elspeth", "Iona", "Maisie", "Skye", "Briallen",
    "Rhona", "Fenella", "Davina", "Shona", "Lorna", "Effie"
]

MAIDEN_NAMES = [
    "Fraser", "MacKenzie", "Campbell", "Gordon", "Murray", "Ross",
    "MacLean", "Grant", "Stewart", "Bruce", "Robertson", "Wilson",
    "Scott", "Graham", "Henderson", "Johnston", "Reid", "Watson"
]

LOCATIONS = [
    "Edinburgh, Scotland", "Glasgow, Scotland", "Aberdeen, Scotland",
    "Inverness, Scotland", "Perth, Scotland", "Stirling, Scotland",
    "Dundee, Scotland", "Oban, Scotland", "Fort William, Scotland",
    "Ayr, Scotland"
]

# -------------------------------------------------------
#  Helpers
# -------------------------------------------------------

def random_date(year_start, year_end):
    days = (datetime(year_end, 12, 31) - datetime(year_start, 1, 1)).days
    random_days = random.randint(0, days)
    birth = datetime(year_start, 1, 1) + timedelta(days=random_days)
    return birth.strftime("%Y-%m-%d")


def death_date(birth_year):
    age_at_death = random.choices(
        [68, 72, 76, 80, 84, 88, 92, 96],
        weights=[5, 10, 20, 25, 20, 10, 7, 3],
        k=1
    )[0]
    return f"{birth_year + age_at_death}-01-01"


def get_generation_note(gen):
    notes = [
        "Family patriarch", "Family matriarch",
        "Eldest son", "Elder daughter", "Younger son", "Youngest daughter",
        "", "", "", "Youngest generation"
    ]
    return notes[min(gen, len(notes)-1)]


def generate_person(uid, gen, parent_uids=None, is_spouse=False, gender_override=None):
    if gender_override:
        gender = gender_override
    else:
        gender = "Male" if random.random() < 0.52 else "Female"

    if gen == 0:
        first_name = random.choice(MALE_FIRST_NAMES) if uid == 1 else random.choice(FEMALE_FIRST_NAMES)
    elif is_spouse:
        first_name = random.choice(FEMALE_FIRST_NAMES) if gender == "Female" else random.choice(MALE_FIRST_NAMES)
    else:
        first_name = random.choice(MALE_FIRST_NAMES if gender == "Male" else FEMALE_FIRST_NAMES)

    last_name = FAMILY_NAME if (gender == "Male" or not is_spouse) else ""
    maiden_name = random.choice(MAIDEN_NAMES) if (gender == "Female" and is_spouse) else ""

    birth_year = START_YEAR + gen * 25 + random.randint(-6, 6)
    if gen >= 5:
        birth_year += random.randint(8, 15)   # slightly later for younger gens

    birth_date = random_date(birth_year, birth_year + 1)
    death_year = birth_year + random.randint(68, 96) if gen <= 4 else "2100"

    if gen >= 6:
        death_year = "2150" if random.random() < 0.6 else "2200"

    residency = random.choice(LOCATIONS)

    return {
        "uid": uid,
        "firstName": first_name,
        "lastName": last_name,
        "maidenName": maiden_name,
        "gender": gender,
        "dateOfBirth": f'new Date("{birth_date}")',
        "dateOfDeath": f'new Date("{death_year}-01-01")',
        "residency": residency,
        "note": get_generation_note(gen) if gen <= 2 else "",
        "parentUid": parent_uids or [],
        "spouseUid": [],
        "offspringUid": [],
        "profilePic": f"{first_name.lower().replace(' ', '-')}.jpg",
        "libarary": [f"{first_name.lower().replace(' ', '-')}.pdf"]
    }


# -------------------------------------------------------
#  Tree generation
# -------------------------------------------------------

def generate_family_tree(max_gen=9, min_children=1, max_children=3):
    people = []
    next_uid = 1

    # Generation 0 – root couple
    patriarch = generate_person(next_uid, 0, gender_override="Male")
    next_uid += 1
    matriarch = generate_person(next_uid, 0, gender_override="Female")
    next_uid += 1

    patriarch["spouseUid"] = [matriarch["uid"]]
    matriarch["spouseUid"] = [patriarch["uid"]]

    people.extend([patriarch, matriarch])

    current_generation = [patriarch["uid"], matriarch["uid"]]
    all_couples = [(patriarch["uid"], matriarch["uid"])]

    for gen in range(1, max_gen + 1):
        next_generation = []
        new_couples = []

        for father_uid, mother_uid in all_couples:
            person_f = next(p for p in people if p["uid"] == father_uid)
            person_m = next(p for p in people if p["uid"] == mother_uid)

            num_children = random.choice(CHILDREN_DISTRIBUTION)

            children = []
            for _ in range(num_children):
                child = generate_person(next_uid, gen, parent_uids=[father_uid, mother_uid])
                next_uid += 1
                children.append(child)
                next_generation.append(child["uid"])
                people.append(child)

            # Update parents' offspring lists
            person_f["offspringUid"].extend([c["uid"] for c in children])
            person_m["offspringUid"].extend([c["uid"] for c in children])

            # Create couples for next generation (only for people who will have children)
            for child in children:
                if gen < max_gen and random.random() < 0.78:  # ~78% marry & have kids
                    spouse_gender = "Female" if child["gender"] == "Male" else "Male"
                    spouse = generate_person(
                        next_uid,
                        gen,
                        is_spouse=True,
                        gender_override=spouse_gender
                    )
                    next_uid += 1
                    people.append(spouse)

                    child["spouseUid"] = [spouse["uid"]]
                    spouse["spouseUid"] = [child["uid"]]

                    new_couples.append((child["uid"], spouse["uid"]))

        all_couples = new_couples
        current_generation = next_generation

    return people


# -------------------------------------------------------
#  Export as TypeScript array
# -------------------------------------------------------

def print_as_typescript_array(people):
    print("export const DatabaseSinclairFlat: Person[] = [")
    for i, p in enumerate(people):
        comma = "," if i < len(people) - 1 else ""
        print("  {")
        for key, value in p.items():
            if isinstance(value, list):
                if not value:
                    print(f'    {key}: [],')
                else:
                    # handle list items (uids are ints, strings are quoted)
                    quoted_items = []
                    for v in value:
                        if isinstance(v, int):
                            quoted_items.append(str(v))
                        else:
                            quoted_items.append(f'"{v}"')
                    print(f'    {key}: [{", ".join(quoted_items)}],')
            elif isinstance(value, str):
                if "new Date" in value:
                    print(f'    {key}: {value},')
                else:
                    print(f'    {key}: "{value}",')
            else:
                print(f'    {key}: {value},')
        print(f"  }}{comma}")
        print("];")


if __name__ == "__main__":
    random.seed(42)  # reproducible for debugging
    family = generate_family_tree(max_gen=9)
    print(f"// Generated Sinclair family tree – {len(family)} people, 9 generations\n")
    print_as_typescript_array(family)